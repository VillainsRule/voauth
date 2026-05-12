import crypto from 'node:crypto';

import Elysia, { status, t } from 'elysia';

import appDB from '../db/impl/AppDB.js';
import userDB from '../db/impl/UserDB.js';

const apps = new Elysia()
    .guard({ detail: { hide: true } })

    .resolve(({ cookie }) => {
        if (cookie.session && typeof cookie.session.value === 'string') {
            const user = userDB.getLink('sessions', cookie.session.value);
            if (user) return { user };
        }

        return status(401, { error: 'not logged in' });
    })

    .get('/api/v1/apps', ({ user }) => {
        const apps = appDB.getLinks('ownerId', user.id);
        return { apps: apps.map(a => ({ id: a.id, name: a.name, url: a.url })) };
    })

    .post('/api/v1/apps', ({ body, user }) => {
        if (body.name.length > 24) return status(413, { error: 'app name too long' });
        if (body.url.length > 100) return status(413, { error: 'app url too long' });

        const id = crypto.randomBytes(8).toString('hex');
        if (appDB.get(id)) return status(500, { error: 'app ID collision, please try again' });

        const app = appDB.add({
            id,
            ownerId: user.id,
            name: body.name,
            url: body.url,
            secret: crypto.randomBytes(12).toString('hex'),
            redirectURIs: []
        });

        return { app: { id: app.id } };
    }, { body: t.Object({ name: t.String(), url: t.String() }) })

    .post('/api/v1/apps/delete', ({ body, user }) => {
        const app = appDB.get(body.id);
        if (!app) return status(404, { error: 'app not found' });
        if (app.ownerId !== user.id) return status(403, { error: 'you do not own this app' });

        const users = userDB.getAll();
        users.forEach((u) => u && u.connectedIds.includes(app.id) && userDB.update(u.id, { connectedIds: u.connectedIds.filter(i => i !== app.id) }));
        appDB.remove(body.id);

        return {};
    }, { body: t.Object({ id: t.String() }) })

    .post('/api/v1/apps/info', ({ body, user }) => {
        const app = appDB.get(body.id);
        if (!app) return status(404, { error: 'app not found' });
        if (app.ownerId !== user.id) return status(403, { error: 'you do not own this app' });

        return { app };
    }, { body: t.Object({ id: t.String() }) })

    .post('/api/v1/apps/redirectURIs', ({ body, user }) => {
        const app = appDB.get(body.id);
        if (!app) return status(404, { error: 'app not found' });
        if (app.ownerId !== user.id) return status(403, { error: 'you do not own this app' });

        appDB.update(body.id, { redirectURIs: body.uris });

        return {};
    }, { body: t.Object({ id: t.String(), uris: t.Array(t.String()) }) })

export default apps;