import crypto from 'node:crypto';

import Elysia, { status, t } from 'elysia';

import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type RegistrationResponseJSON,
    type VerifiedAuthenticationResponse,
    type VerifiedRegistrationResponse
} from '@simplewebauthn/server';

import passkeyDB from '../db/impl/PasskeyDB';
import userDB from '../db/impl/UserDB';

const currentRegistrations: Record<number, { name: string, value: string, expiry: number }> = {};

const passkeysConfigured = typeof Bun.env.RP_ID === 'string';

const passkeys = new Elysia({ name: 'passkeys' })
    .guard({ detail: { hide: true } })

    .post('/api/auth/webauthn/register/options', async ({ body, cookie: { session } }) => {
        if (!passkeysConfigured) return status(404);

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (body.name.length > 24) return status(413, { error: 'name too long' });

        if (currentRegistrations[user.id] && currentRegistrations[user.id].expiry > Date.now())
            return status(400, { error: 'you have an ongoing registration, please complete or wait for it to expire' });

        const existingPasskeys = user.passkeyIds.map(e => passkeyDB.get(e)).filter(Boolean);
        if (existingPasskeys.some((pk) => pk && pk.name === body.name))
            return status(400, { error: 'you already have a passkey with that name' });

        if (user.passkeyIds.length >= 10)
            return status(400, { error: 'you have reached the maximum number of passkeys (10)' });

        const opts = await generateRegistrationOptions({
            rpName: 'voauth',
            rpID: Bun.env.RP_ID!,
            userName: user.username,
            userID: Buffer.from(user.id.toString()),
            attestationType: 'none',
            excludeCredentials: user.passkeyIds.map(e => ({ id: e })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred'
            }
        });

        currentRegistrations[user.id] = {
            name: body.name,
            value: opts.challenge,
            expiry: Date.now() + (2 * 60 * 1000)
        };

        return opts;
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/webauthn/register/verify', async ({ body, headers: { origin }, cookie: { session } }) => {
        if (!passkeysConfigured) return status(404);
        if (!origin) return status(404);

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const currentChallenge = currentRegistrations[user.id];
        if (!currentChallenge || currentChallenge.expiry < Date.now())
            return status(400, { error: 'challenge has expired, please try registering again' });

        const passableBody = { ...body } as { name?: string } & RegistrationResponseJSON;
        delete passableBody.name;

        let verification: VerifiedRegistrationResponse;

        try {
            verification = await verifyRegistrationResponse({
                response: passableBody,
                expectedChallenge: currentChallenge.value,
                expectedOrigin: origin,
                expectedRPID: Bun.env.RP_ID!
            });
        } catch (error) {
            console.error(error);
            return status(400, { error: (error as Error).message });
        }

        if (!verification.verified || !verification.registrationInfo) {
            return status(400, { error: 'could not verify registration' });
        }

        passkeyDB.add({
            userId: user.id,
            webAuthnUserID: Buffer.from(user.id.toString()).toString('base64'),
            id: verification.registrationInfo.credential.id,
            publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64'),
            counter: verification.registrationInfo.credential.counter,
            transports: verification.registrationInfo.credential.transports || [],
            deviceType: verification.registrationInfo.credentialDeviceType || 'unknown',
            backedUp: verification.registrationInfo.credentialBackedUp || false,
            lastUsed: 0,
            name: currentChallenge.name
        });

        const passkeyIds = user.passkeyIds;
        passkeyIds.push(verification.registrationInfo.credential.id);
        userDB.update(user.id, { passkeyIds });

        delete currentRegistrations[user.id];

        return { verified: true };
    }, {
        body: t.Object({
            id: t.String(),
            rawId: t.String(),
            response: t.Object({
                clientDataJSON: t.String(),
                attestationObject: t.String(),
                authenticatorData: t.Optional(t.String()),
                transports: t.Optional(
                    t.Array(
                        t.Union([
                            t.Literal('ble'),
                            t.Literal('cable'),
                            t.Literal('hybrid'),
                            t.Literal('internal'),
                            t.Literal('nfc'),
                            t.Literal('smart-card'),
                            t.Literal('usb')
                        ])
                    )
                ),
                publicKeyAlgorithm: t.Optional(t.Number()),
                publicKey: t.Optional(t.String())
            }),
            authenticatorAttachment: t.Optional(t.String()),
            clientExtensionResults: t.Object({
                appid: t.Optional(t.Boolean()),
                hmacCreateSecret: t.Optional(t.Boolean()),
                credProps: t.Optional(t.Object({ rk: t.Optional(t.Boolean()) }))
            }),
            type: t.Literal('public-key')
        }),
        headers: t.Object({ origin: t.Optional(t.String()) }),
        cookie: t.Cookie({ session: t.String() })
    })

    .post('/api/auth/webauthn/login/options', async ({ cookie: { webauthn } }) => {
        if (!passkeysConfigured) return status(404);

        const options = await generateAuthenticationOptions({
            rpID: Bun.env.RP_ID!,
            userVerification: 'preferred'
        });

        webauthn.value = options.challenge;
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'lax';
        webauthn.secure = true;

        return options;
    })

    .post('/api/auth/webauthn/login/verify', async ({ body, headers: { origin }, cookie: { webauthn, session } }) => {
        if (!passkeysConfigured) return status(404);
        if (!origin) return status(404);

        const passableBody = body as AuthenticationResponseJSON;

        const passkey = passkeyDB.get(body.id);
        if (!passkey) return status(401, { error: 'could not find passkey' });

        const user = userDB.get(passkey.userId);
        if (!user) return status(401, { error: 'could not find passkey' });

        if (body.response.userHandle) {
            if (Buffer.from(body.response.userHandle, 'base64').toString() !== user.id.toString())
                return status(401, { error: 'could not find passkey' });
        }

        let verification: VerifiedAuthenticationResponse;

        try {
            verification = await verifyAuthenticationResponse({
                response: passableBody,
                expectedChallenge: webauthn.value,
                expectedOrigin: origin,
                expectedRPID: Bun.env.RP_ID!,
                credential: {
                    id: passkey.id,
                    publicKey: Buffer.from(passkey.publicKey, 'base64'),
                    counter: passkey.counter,
                    transports: passkey.transports
                }
            });
        } catch (error) {
            console.error(error);
            return status(400, { error: (error as Error).message });
        }

        if (!verification.verified) return status(400, { error: 'could not verify authentication' });

        passkeyDB.update(verification.authenticationInfo.credentialID, {
            counter: verification.authenticationInfo.newCounter,
            lastUsed: Date.now()
        });

        const newSession = crypto.randomBytes(32).toString('hex');
        userDB.update(user.id, { sessions: [...user.sessions, newSession] });

        session.value = newSession;
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'lax';
        session.secure = true;

        webauthn.value = '';
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'lax';
        webauthn.maxAge = 0;
        webauthn.secure = true;

        return { user: { id: user.id, username: user.username } };
    }, {
        body: t.Object({
            id: t.String(),
            rawId: t.String(),
            response: t.Object({
                clientDataJSON: t.String(),
                authenticatorData: t.String(),
                signature: t.String(),
                userHandle: t.Optional(t.String())
            }),
            type: t.Literal('public-key')
        }),
        headers: t.Object({ origin: t.Optional(t.String()) }),
        cookie: t.Cookie({ webauthn: t.String() })
    })

export default passkeys;