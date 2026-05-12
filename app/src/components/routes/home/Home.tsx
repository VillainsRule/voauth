import { useEffect, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';

import { startRegistration } from '@simplewebauthn/browser';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Separator } from '@/components/ui/separator.tsx';

import { Plus } from 'lucide-react';

import api, { errorFrom } from '@/lib/eden.ts';
import { shadd } from '@/lib/shadd.tsx';
import { getRelativeTime } from '@/lib/utils.ts';

import type { PublicPasskey } from '../../../../../types/index';

interface PublicApp {
    id: string;
    name: string;
    url: string;
}

export default function Home() {
    const [apps, setApps] = useState<PublicApp[]>([]);
    const [passkeys, setPasskeys] = useState<PublicPasskey[]>([]);

    const fetchPasskeys = () => api.v1.home.get().then((res) => {
        if (res.data) {
            setApps(res.data.connected);
            setPasskeys(res.data.passkeys.map((pk) => ({ ...pk, lastUsed: getRelativeTime(pk.lastUsed) })));
        } else shadd.setError(errorFrom(res));
    });

    useEffect(() => {
        fetchPasskeys();
    }, []);

    return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm overflow-hidden'>
                <CardHeader className='pb-px'>
                    <div className='flex items-start justify-between'>
                        <div>
                            <p className='text-base font-semibold tracking-tight'>voauth</p>
                            <p className='text-xs text-muted-foreground mt-0.5'>@{window.props.user.username}</p>
                        </div>

                        <Button variant='ghost' size='sm' className='text-xs h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                            onClick={() => api.auth.logout.post().then(() => location.href = '/auth/login')}>
                            logout
                        </Button>
                    </div>
                </CardHeader>

                <Separator />

                <CardContent className='py-0.5 space-y-1'>
                    <div className='flex justify-between items-center mb-3'>
                        <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Passkeys</Label>
                        <button
                            className='text-muted-foreground hover:text-foreground transition-colors'
                            onClick={() => shadd.prompt(
                                'add a new passkey',
                                'name your passkey something you\'ll remember later, such as your device\'s name.',
                                { placeholder: 'iCloud', maxLength: 24, minLength: 1 },
                                async (value: string) => {
                                    const options = await api.auth.webauthn.register.options.post({ name: value });
                                    if (!options.data) return shadd.setError(errorFrom(options));

                                    let attResp;
                                    try {
                                        attResp = await startRegistration({ optionsJSON: options.data });
                                    } catch (e) {
                                        console.error(e);
                                        return shadd.setError('an error occurred during passkey registration. please try again.');
                                    }

                                    const verifyRes = await api.auth.webauthn.register.verify.post(attResp);
                                    if (verifyRes.data) { fetchPasskeys(); shadd.close(); }
                                    else shadd.setError(errorFrom(verifyRes));
                                }
                            )}>
                            <Plus className='w-3.5 h-3.5' />
                        </button>
                    </div>

                    {passkeys.length ? (
                        <div className='space-y-1'>
                            {passkeys.map((pk) => (
                                <div key={pk.id} className='flex items-center justify-between px-3 py-2 rounded-md bg-secondary/60 group'>
                                    <div className='flex flex-col gap-0.5'>
                                        <span className='text-sm'>{pk.name}</span>
                                        <span className='text-xs text-muted-foreground'>used {pk.lastUsed}</span>
                                    </div>
                                    <Button variant='ghost' size='xs'
                                        className='opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => api.auth.passkeys.delete.post({ id: pk.id }).then(fetchPasskeys)}>
                                        delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-xs text-muted-foreground text-center py-2'>no passkeys</p>
                    )}
                </CardContent>

                <Separator />

                <CardContent className='py-0.5'>
                    <div className='flex justify-between items-center mb-3'>
                        <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Connected Apps</Label>
                    </div>

                    {apps.length ? (
                        <div className='space-y-1'>
                            {apps.map((app) => (
                                <div key={app.id} className='flex items-center justify-between px-3 py-2 rounded-md bg-secondary/60 group'>
                                    <div className='flex items-center gap-0.5'>
                                        <span className='text-sm'>{app.name} <span className='text-xs text-muted-foreground'>&gt;&gt; <a href={app.url} className='underline' target='_blank'>{app.url}</a></span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-xs text-muted-foreground text-center py-2'>no connected apps</p>
                    )}
                </CardContent>

                <Separator />

                <CardContent>
                    <Button variant='outline' className='w-full text-xs h-8 text-muted-foreground' onClick={() => navigate('/home/apps')}>
                        manage applications
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}