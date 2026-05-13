import crypto from 'node:crypto';

import Elysia, { t } from 'elysia';

import appDB from '../db/impl/AppDB.js';
import userDB from '../db/impl/UserDB.js';

import { getSSRBody } from '../util/ssr.js';

const codeStore = new Map<string, { user: string, clientId: string, expiresAt: number }>();

const redirectURIMatches = (registered: string, incoming: string): boolean => {
    try {
        const r = new URL(registered);
        const i = new URL(incoming);
        return r.protocol === i.protocol &&
            r.hostname === i.hostname &&
            r.port === i.port &&
            r.pathname === i.pathname;
    } catch {
        return false;
    }
}

const oauth = new Elysia({ name: 'oauth' })
    .get('/oauth/v1', async ({ cookie, query }) => {
        const { client_id, redirect_uri, state } = query;
        if (!client_id || !redirect_uri) return getSSRBody(cookie.session?.value, { oauth: { error: 'missing client_id or redirect_uri' } });

        const session = cookie.session?.value;
        if (!session) return new Response(null, { status: 302, headers: { Location: `/auth/login?to=${encodeURIComponent(`/oauth/v1?client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state || ''}`)}` } });

        const app = appDB.get(client_id);
        if (!app) return getSSRBody(cookie.session?.value, { oauth: { error: 'invalid client_id' } });
        if (!app.redirectURIs.some(uri => redirectURIMatches(uri, redirect_uri))) return getSSRBody(cookie.session?.value, { oauth: { error: 'redirect_uri not registered for this client_id' } });

        let loginLink = `/login?to=${encodeURIComponent(`/oauth/v1?client_id=${client_id}&redirect_uri=${redirect_uri}`)}`;
        if (state) loginLink += `&state=${encodeURIComponent(state)}`;

        const user = userDB.getLink('sessions', session);
        if (!user) return new Response(null, { status: 302, headers: { Location: loginLink } });

        if (!user.connectedIds.includes(client_id)) {
            try {
                const redirectHost = new URL(redirect_uri).origin;
                const owner = userDB.get(app.ownerId);
                return getSSRBody(cookie.session?.value, { oauth: { app: { id: app.id, name: app.name, url: app.url, owner: owner?.username }, loginLink, redirectHost } });
            } catch {
                return getSSRBody(cookie.session?.value, { oauth: { error: 'invalid redirect_uri' } });
            }
        }

        const code = crypto.randomBytes(16).toString('hex');
        codeStore.set(code, { user: session, clientId: client_id, expiresAt: Date.now() + 5 * 60 * 1000 });

        const redirectURL = new URL(redirect_uri);
        redirectURL.searchParams.set('code', code);
        if (state) redirectURL.searchParams.set('state', state);

        return new Response(null, {
            status: 302,
            headers: { Location: redirectURL.toString() }
        });
    }, { query: t.Object({ client_id: t.Optional(t.String()), redirect_uri: t.Optional(t.String()), state: t.Optional(t.String()) }), cookie: t.Cookie({ session: t.Optional(t.String()) }) })

    .post('/api/v1/oauth/authorize', ({ body, cookie }) => {
        const session = cookie.session?.value;
        if (!session) return { error: 'not logged in' };

        const app = appDB.get(body.appId);
        if (!app) return { error: 'invalid app ID' };

        const user = userDB.getLink('sessions', session);
        if (!user) return { error: 'invalid session' };

        userDB.update(user.id, { connectedIds: Array.from(new Set([...user.connectedIds, app.id])) });

        const code = crypto.randomBytes(16).toString('hex');
        codeStore.set(code, { user: session, clientId: body.appId, expiresAt: Date.now() + 5 * 60 * 1000 });

        return { success: true };
    }, { body: t.Object({ appId: t.String() }), cookie: t.Cookie({ session: t.String() }), detail: { hide: true } })

    .post('/api/v1/oauth/validate', ({ body }) => {
        const app = appDB.get(body.appId);
        if (!app) return { error: 'invalid app ID' };

        if (app.secret !== body.appSecret) return { error: 'invalid client_secret' };

        const codeInfo = codeStore.get(body.code);
        if (!codeInfo) return { error: 'invalid code' };

        if (codeInfo.expiresAt < Date.now()) {
            codeStore.delete(body.code);
            return { error: 'code expired' };
        }

        if (codeInfo.clientId !== body.appId) return { error: 'code not valid for this app' };

        const user = userDB.getLink('sessions', codeInfo.user);
        if (!user) return { error: 'user does not exist in database' };

        userDB.update(user.id, { connectedIds: Array.from(new Set([...user.connectedIds, app.id])) });

        return { success: true, user: { id: user.id, username: user.username } };
    }, { body: t.Object({ appId: t.String(), appSecret: t.String(), code: t.String() }), detail: { hide: true } })

export default oauth;