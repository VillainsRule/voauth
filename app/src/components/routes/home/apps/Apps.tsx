import { useEffect, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Separator } from '@/components/ui/separator.tsx';

import UserHeader from '../UserHeader';

import { Plus } from 'lucide-react';

import api from '@/lib/eden.ts';
import { shadd } from '@/lib/shadd.tsx';
import { cleanLink } from '@/lib/utils';

import type { PublicApp } from '../../../../../../types/index';

export default function Apps() {
    const [apps, setApps] = useState<PublicApp[]>([]);

    const fetchApps = () => api.v1.apps.get().then((res) => {
        if (res.data) setApps(res.data.apps);
        else alert('failed to fetch apps :(');
    });

    useEffect(() => {
        if (window.props.user) fetchApps();
        else navigate('/auth/login');
    }, []);

    if (!window.props.user) return <>redirecting...</>;

    return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm overflow-hidden'>
                <UserHeader />
                <Separator />

                <CardContent className='py-0.5'>
                    <div className='flex justify-between items-center mb-3'>
                        <Label className='text-xs text-muted-foreground uppercase tracking-wider'>Your Applications</Label>
                        <button
                            className='text-muted-foreground hover:text-foreground transition-colors'
                            onClick={() => shadd.prompt(
                                'create an app',
                                'create a new app here',
                                [
                                    { placeholder: 'app name', minLength: 2, maxLength: 24 },
                                    { placeholder: 'app url', minLength: 10, maxLength: 100 }
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
                                        className='opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10'>
                                        open
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-xs text-muted-foreground text-center py-2'>no apps yet</p>
                    )}
                </CardContent>

                <Separator />

                <CardContent>
                    <Button variant='outline' className='w-full text-xs h-8 text-muted-foreground' onClick={() => navigate('/home')}>
                        back to home
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}