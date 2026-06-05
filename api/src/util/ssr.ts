import fs from 'node:fs';
import path from 'node:path';

import userDB from '../db/impl/UserDB';

const distDir = path.resolve(import.meta.dirname, '../../../app/dist');

export const getSSRBody = async (sessionValue: string | undefined, inputProps?: object): Promise<Response> => {
    let index = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

    const user = sessionValue ? userDB.getLink('sessions', sessionValue) : null;

    const props = {
        user: user ? { id: user.id, username: user.username } : null,
        instance: { allowPasskeys: typeof process.env.RP_ID === 'string' }
    }

    if (inputProps) Object.assign(props, inputProps);

    const safeProps = JSON.stringify(props).replace(/<\//g, '<\\/').replace(/"/g, '\\"');
    index = index.replace('__ssr_props__', () => safeProps);

    return new Response(index, { headers: { 'Content-Type': 'text/html' } });
}