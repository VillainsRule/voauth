import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card.tsx';

import { Link2, User } from 'lucide-react';

import api from '@/lib/eden.ts';

export default function V1() {
    if (window.props.oauth.error) return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm overflow-hidden'>
                <CardHeader className='pb-px text-center'>
                    <p className='text-base font-semibold tracking-tight'>voauth</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>{window.props.oauth.error}</p>
                </CardHeader>
            </Card>
        </div>
    );

    if (window.props.oauth.app) return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm overflow-hidden'>
                <CardHeader className='pb-px text-center gap-0'>
                    <p className='text-2xl font-semibold tracking-tight'>{window.props.oauth.app.name}</p>
                    <p className='text-md text-muted-foreground'>would like to sign in with voauth</p>
                    <p className='text-xs text-muted-foreground mt-1'>signed in as @{window.props.user.username} - <span className='underline cursor-pointer' onClick={() => {
                        api.auth.logout.post().then(() => (location.href = window.props.oauth.loginLink!));
                    }}>not you?</span></p>
                </CardHeader>

                <CardContent>
                    <div className='w-full bg-muted/70 py-1 px-2 rounded-sm'>
                        <div className='text-xxs text-muted-foreground'>
                            <Link2 className='inline mb-0.5 mr-1 w-2.5 -rotate-45' />
                            You'll be redirected to {window.props.oauth.redirectHost} after authorizing
                        </div>

                        <div className='text-xxs text-muted-foreground -mt-1'>
                            <User className='inline mb-0.5 mr-1 w-2.5' />
                            This app is owned by @{window.props.oauth.app.owner}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className='px-4'>
                    <Button className='w-full' onClick={() => api.v1.oauth.authorize.post({ appId: window.props.oauth.app!.id }).then((res) => {
                        if (res.data) location.reload();
                        else alert('failed to authorize app :(');
                    })}>authorize</Button>
                </CardFooter>
            </Card>
        </div>
    );

    return null;
}