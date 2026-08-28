import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'

import { startAuthentication } from '@simplewebauthn/browser'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import api, { errorFrom } from '@/lib/eden'

const searchParams = new URLSearchParams(window.location.search);

export default function Auth({ act }: { act: 'login' | 'join' }) {
    const [, navigate] = useLocation();

    const [allowCredentials] = useState<any[]>(JSON.parse(localStorage.getItem('passkeys') || '[]'));
    const [showingAll, setShowingAll] = useState<boolean>(allowCredentials.length < 1);

    const [standardError, setStandardError] = useState<string>('');

    const [usernameInput, setUsernameInput] = useState<string>('');
    const [passwordInput, setPasswordInput] = useState<string>('');

    const passwordRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (searchParams.get('to') && window.props.user) location.href = `${location.origin}${searchParams.get('to')}`;
        else if (window.props.user) navigate('/home');
        else if (!showingAll) doWebAuthn(true);
    }, []);

    const doWebAuthn = async (fromInitial?: boolean) => {
        const res = await api.auth.webauthn.login.options.post({});
        if (!res.data) return alert(errorFrom(res));

        if (!showingAll) {
            res.data.allowCredentials = allowCredentials.map(e => ({ ...e, type: 'public-key' }));
            res.data.userVerification = 'required';
        }

        let assertionResp;
        try {
            assertionResp = await startAuthentication({ optionsJSON: res.data });
        } catch (err: any) {
            console.log(err);
            if (!fromInitial) setStandardError('failed to complete passkey authentication. try again or sign in with another method.');
            return;
        }

        api.auth.webauthn.login.verify.post(assertionResp).then((res) => {
            if (res.data) location.reload();
            else setStandardError(errorFrom(res));
        });
    }

    const handleLogin = () => api.auth.account.post({
        act,
        username: usernameInput,
        password: passwordInput
    }).then((res) => {
        if (res.data) {
            if (searchParams.get('to')) location.href = `${location.origin}${searchParams.get('to')}`;
            else location.href = '/home';
        } else setStandardError(errorFrom(res));
    });

    return (
        <div className='min-h-screen flex items-center justify-center bg-muted/30'>
            <Card className='w-11/12 md:w-full max-w-sm'>
                <CardHeader className='text-center flex flex-col items-center gap-0 pb-2'>
                    <CardTitle className='text-xl'>voauth</CardTitle>
                    <CardDescription>{act === 'join' ? 'join voauth to authorize applications' : 'log in to authorize applications'}</CardDescription>
                </CardHeader>

                {showingAll || !window.props.instance.allowPasskeys ? (
                    <CardContent className='space-y-4'>
                        <form onSubmit={(e) => (e.preventDefault(), handleLogin())} className='space-y-4'>
                            <Input
                                id='username'
                                placeholder='username'
                                type='text'
                                value={usernameInput}
                                required
                                autoFocus
                                className='space-y-1.5'
                                onInput={(e) => setUsernameInput(e.currentTarget.value)}
                                onKeyDown={(e) => e.key === 'Enter' && passwordRef.current?.focus()}
                            />

                            <Input
                                id='password'
                                placeholder='password'
                                type='password'
                                value={passwordInput}
                                required
                                ref={passwordRef}
                                className='space-y-1.5'
                                onInput={(e) => setPasswordInput(e.currentTarget.value)}
                                onKeyDown={(e) => e.key === 'Enter' && buttonRef.current?.click()}
                            />

                            {standardError && (
                                <p className='text-destructive text-sm'>{standardError}</p>
                            )}

                            <Button ref={buttonRef} type='submit' variant='outline' className='w-full cursor-pointer'>log in</Button>
                        </form>

                        <div className='relative flex items-center gap-3'>
                            <div className='flex-1 h-px bg-border' />
                            <span className='text-xs text-muted-foreground'>or</span>
                            <div className='flex-1 h-px bg-border' />
                        </div>

                        {window.props.instance.allowPasskeys && (
                            <Button variant='outline' className='w-full cursor-pointer' onClick={() => doWebAuthn()}>
                                use a passkey
                            </Button>
                        )}

                        <Button variant='outline' className='w-full cursor-pointer -mt-1' onClick={() => act === 'join' ? navigate('/auth/login') : navigate('/auth/join')}>
                            {act === 'join' ? 'i already have an account' : 'i don\'t have an account'}
                        </Button>
                    </CardContent>
                ) : (
                    <CardContent className='space-y-3'>
                        <button
                            onClick={() => doWebAuthn()}
                            className='w-full border-2 border-dashed border-border hover:bg-muted/50 p-6 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer'
                        >
                            <span className='text-sm text-muted-foreground'>authenticate with your passkey</span>
                        </button>

                        {standardError && (
                            <p className='text-destructive text-sm'>{standardError}</p>
                        )}

                        <Button variant='ghost' size='sm' className='w-full cursor-pointer text-muted-foreground' onClick={() => setShowingAll(true)}>
                            sign in with another method
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}