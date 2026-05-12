import path from 'node:path';

import userDB from '../db/impl/UserDB';

const distDir = path.resolve(import.meta.dirname, '../../../app/dist');

export const getSSRBody = async (sessionValue: string | undefined, inputProps?: object): Promise<Response> => {
    let index = await Bun.file(path.join(distDir, 'index.html')).text();

    const user = sessionValue ? userDB.getLink('sessions', sessionValue) : null;

    const props = {
        user: user ? { id: user.id, username: user.username } : null,
        instance: { allowPasskeys: typeof Bun.env.RP_ID === 'string' }
    }

    if (inputProps) Object.assign(props, inputProps);

    const safeProps = JSON.stringify(props).replace(/<\//g, '<\\/').replace(/"/g, '\\"');
    index = index.replace('__ssr_props__', () => safeProps);

    return new Response(index, { headers: { 'Content-Type': 'text/html' } });
}