import Elysia, { status, t } from 'elysia';

import appDB from '../db/impl/AppDB.js';
import passkeyDB from '../db/impl/PasskeyDB.js';
import userDB from '../db/impl/UserDB.js';

import type { DBPasskey } from '../../../types';

const home = new Elysia({ name: 'home' })
    .guard({ detail: { hide: true } })

    .get('/api/v1/home', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const passkeys = user.passkeyIds.map(e => passkeyDB.get(e)).filter((e): e is DBPasskey => e !== undefined).map((pk) => {
            return {
                id: pk.id,
                name: pk.name,
                transports: pk.transports,
                lastUsed: pk.lastUsed
            }
        });

        const connected = user.connectedIds.map(id => {
            const app = appDB.get(id);
            if (!app) return null;
            return { id: app.id, name: app.name, url: app.url };
        }).filter((a): a is { id: string, name: string, url: string } => a !== null);

        return { connected, passkeys };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/passkeys/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        passkeyDB.remove(body.id);
        userDB.update(user.id, { passkeyIds: user.passkeyIds.filter(i => i !== body.id) });

        return {};
    }, { body: t.Object({ id: t.String() }), cookie: t.Cookie({ session: t.String() }) })

export default home;