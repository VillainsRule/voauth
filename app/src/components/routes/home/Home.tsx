import { useEffect, useRef, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';

import { startRegistration } from '@simplewebauthn/browser';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Separator } from '@/components/ui/separator.tsx';

import { Plus } from 'lucide-react';

import UserHeader from './UserHeader';

import api, { errorFrom } from '@/lib/eden.ts';
import { shadd } from '@/lib/shadd.tsx';
import { cleanLink, getRelativeTime } from '@/lib/utils.ts';

import type { PublicApp, PublicPasskey } from '../../../../../types/index';

export default function Home() {
    const [apps, setApps] = useState<PublicApp[]>([]);
    const [passkeys, setPasskeys] = useState<PublicPasskey[]>([]);

    const fetchData = () => api.v2.home.get().then((res) => {
        if (res.data) {
            setApps(res.data.apps.map((a) => ({ ...a, url: cleanLink(a.url) })));
            setPasskeys(res.data.passkeys.map((pk) => ({ ...pk, lastUsed: getRelativeTime(pk.lastUsed) })));
            localStorage.setItem('passkeys', JSON.stringify(res.data.passkeys));
        } else shadd.setError(errorFrom(res));
    });

    useEffect(() => {
        if (window.props.user) fetchData();
        else navigate('/auth/login');
    }, []);

    if (!window.props.user) return <>redirecting...</>;

    const newPasskeyRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (location.href.includes('newPasskey=1') && newPasskeyRef.current) {
            history.pushState({}, '', '/home');
            newPasskeyRef.current.click();
        }
    }, [newPasskeyRef]);

    return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm lg:w-xl overflow-hidden gap-2.5'>
                <UserHeader />
                <Separator />

                <div className='flex flex-col lg:flex-row w-full gap-4 lg:gap-0'>
                    <CardContent className='py-0.5 lg:w-1/2'>
                        <div className='flex justify-between items-center mb-3'>
                            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Applications</Label>
                            <button
                                className='text-muted-foreground hover:text-foreground transition-colors'
                                onClick={() => shadd.prompt(
                                    'create an app',
                                    'you will be able to change this later',
                                    [
                                        { placeholder: 'app name', minLength: 2, maxLength: 24 },
                                        {
                                            placeholder: 'app url',
                                            minLength: 12,
                                            maxLength: 100,
                                            validate: (val) => {
                                                try {
                                                    new URL(val);
                                                    return true;
                                                } catch {
                                                    return false;
                                                }
                                            }
                                        }
                                    ],
                                    (name: string, url: string) => api.v1.apps.post({ name, url }).then((res) => {
                                        if (res.data) {
                                            navigate('/home/apps/' + res.data.app.id);
                                            shadd.close();
                                        } else alert('failed to create app :(');
                                    })
                                )}>
                                <Plus className='w-3.5 h-3.5' />
                            </button>
                        </div>

                        {apps.length ? (
                            <div className='space-y-1'>
                                {apps.map((app) => (
                                    <div key={app.id} className='flex items-center justify-between px-3 py-2 rounded-md bg-secondary/60 group cursor-pointer' onClick={() => navigate('/home/apps/' + app.id)}>
                                        <span className='text-sm'>{app.name} <span className='text-muted-foreground'>-- <a href={app.url} className='underline' target='_blank'>{cleanLink(app.url)}</a></span></span>

                                        <Button variant='ghost' size='xs'
                                            className='opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-muted-foreground'>
                                            open
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='text-xs text-muted-foreground text-center py-2'>no apps yet</p>
                        )}
                    </CardContent>

                    <Separator className='hidden lg:inline' orientation='vertical' />
                    <Separator className='lg:hidden' />

                    <CardContent className='py-0.5 space-y-1 lg:w-1/2'>
                        <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Login</Label>

                        <Button variant='secondary' className='w-full text-xs h-8 text-muted-foreground' onClick={() => shadd.prompt(
                            'change password',
                            'enter your new password below. it must be at least 8 characters long.',
                            { placeholder: 'new password', minLength: 8, maxLength: 100, password: true },
                            (value: string) => api.auth.password.post({ password: value }).then((res) => {
                                if (res.data) shadd.close();
                                else shadd.setError(errorFrom(res));
                            })
                        )}>
                            change password
                        </Button>

                        <div className='flex justify-between items-center my-3'>
                            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Passkeys</Label>
                            <button
                                ref={newPasskeyRef}
                                className='text-muted-foreground hover:text-foreground transition-colors'
                                onClick={() => shadd.prompt(
                                    'add a new passkey',
                                    'name it something you\'ll remember later, like your device\'s name.',
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
                                        if (verifyRes.data) (fetchData(), shadd.close());
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
                                            onClick={() => api.auth.passkeys.delete.post({ id: pk.id }).then(fetchData)}>
                                            delete
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='text-xs text-muted-foreground text-center py-2'>no passkeys</p>
                        )}
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}