import crypto from 'node:crypto';

import { Elysia, status, t } from 'elysia';

import userDB from '../db/impl/UserDB';

import Hasher from '../util/hasher';

const passkeysConfigured = typeof Bun.env.RP_ID === 'string';

const auth = new Elysia({ name: 'auth' })
    .guard({ detail: { hide: true } })

    .post('/api/auth/account', async ({ body, cookie: { session } }) => {
        try {
            const user = userDB.getLink('username', body.username);
            if (user) {
                const isValidPassword = Hasher.matches(body.password, user.password);
                if (!isValidPassword) {
                    if (body.act === 'join') return status(401, { error: 'an account with that name already exists' });
                    else return status(401, { error: 'incorrect password' });
                }

                const newSession = crypto.randomBytes(32).toString('hex');
                userDB.update(user.id, { sessions: [...user.sessions, newSession] });

                session.value = newSession;
                session.httpOnly = true;
                session.path = '/';
                session.sameSite = 'strict';
                session.secure = true;

                return { user: { id: user.id, username: user.username }, instance: { passkeysConfigured } };
            } else {
                if (body.act === 'login') return status(401, { error: 'no account with that name exists' });

                if (body.password.length < 4) return status(400, { error: 'password is too short' });
                if (body.password.length > 24) return status(413, { error: 'password too long' });

                if (body.username.length > 16) return status(413, { error: 'username too long' });

                const newSession = crypto.randomBytes(32).toString('hex');
                const nextID = userDB.keys.length;

                userDB.add({
                    id: nextID,
                    username: body.username,
                    password: Hasher.encode(body.password),
                    sessions: [newSession],
                    passkeyIds: [],
                    connectedIds: []
                });

                session.value = newSession;
                session.httpOnly = true;
                session.path = '/';
                session.sameSite = 'strict';
                session.secure = true;

                return { user: { id: nextID, username: body.username }, instance: { passkeysConfigured } };
            }
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ act: t.Union([t.Literal('login'), t.Literal('join')]), username: t.String(), password: t.String() }) })

    .post('/api/auth/logout', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return {};

        user.sessions = user.sessions.filter(s => s !== session.value);
        userDB.update(user.id, { sessions: user.sessions });

        session.value = '';
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'strict';
        session.maxAge = 0;
        session.secure = true;

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) })

export default auth;