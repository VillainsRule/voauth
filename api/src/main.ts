import Elysia, { t } from 'elysia';

import fs from 'node:fs';
import path from 'node:path';

import mime from 'mime/lite';

import apps from './endpoints/apps';
import auth from './endpoints/auth';
import home from './endpoints/home.js';
import oauth from './endpoints/oauth.js';
import passkeys from './endpoints/passkeys';

import { getSSRBody } from './util/ssr.js';

const distDir = path.resolve(import.meta.dirname, '../../app/dist');

const files = new Elysia({ name: 'files' });

const assetDir = path.join(distDir, 'a');
const assets = fs.readdirSync(assetDir);

for (const a of assets) files.get(`/a/${a}`, () => new Response(
    fs.createReadStream(path.join(assetDir, a)),
    { headers: { 'content-type': mime.getType(a) || 'application/octet-stream' } }
));

const app = new Elysia({ serve: { maxRequestBodySize: 1024 * 1024 * 0.05 } })
    .get('/*', async ({ cookie }) => getSSRBody(cookie.session?.value), { detail: { hide: true }, cookie: t.Object({ session: t.Optional(t.String()) }) })
    .get('/favicon.ico', ({ set }) => {
        set.headers['Cache-Control'] = 'public, max-age=31536000, immutable, no-transform';
        set.headers['Content-Type'] = 'image/x-icon';
        return new Response(fs.createReadStream(path.join(import.meta.dirname, 'app', 'icons', '32.png')), { headers: { 'content-type': 'image/x-icon' } });
    }, { detail: { hide: true } })
    .get('/robots.txt', () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } }), { detail: { hide: true } })
    .use(files)
    .use(apps)
    .use(auth)
    .use(home)
    .use(oauth)
    .use(passkeys)
    .listen(4466, () => console.log(`voauth -> ${process.env.RP_ID !== 'localhost' ? `https://${process.env.RP_ID}` : 'http://localhost:4466'}`));

export type App = typeof app;