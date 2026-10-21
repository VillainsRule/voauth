import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { navigate } from 'wouter/use-browser-location';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';

import UserHeader from '../../UserHeader';

import { Link, Pencil, Plus, Trash, X } from 'lucide-react';

import api from '@/lib/eden.ts';
import { shadd } from '@/lib/shadd.tsx';

import type { DBApp } from '../../../../../../../types/index';

export default function App() {
    const params = useParams();
    if (!params.id) return <div>invalid app id</div>;

    const [app, setApp] = useState<DBApp>({ id: params.id, name: '', url: '', redirectURIs: [], ownerId: 0, secret: '' });

    const fetchApp = () => api.v1.apps.info.post({ id: params.id! }).then((res) => {
        if (res.data) {
            setApp(res.data.app);
            setEditedURIs(res.data.app.redirectURIs);
        } else alert('failed to fetch app :(');
    });

    useEffect(() => {
        if (window.props.user) fetchApp();
        else navigate('/auth/login');
    }, []);

    const [copied, setCopied] = useState<string>('');

    const [editedURIs, setEditedURIs] = useState<string[]>(app.redirectURIs);
    const [newURI, setNewURI] = useState('');

    if (!window.props.user) return <>redirecting...</>;

    return (
        <div className='flex items-center justify-center h-screen bg-muted/30'>
            <Card className='w-sm overflow-hidden gap-2.5'>
                <UserHeader />
                <Separator />

                <CardContent className='flex justify-between items-center py-0.5'>
                    <div>
                        <p className='font-semibold text-base'>{app.name}</p>
                        <p className='text-sm text-muted-foreground'>{app.url.replace(/http(s?):\/\//, '')}</p>
                    </div>

                    <div className='flex items-center gap-1'>
                        <Button variant='ghost' className='h-8 gap-1.5 text-xs text-muted-foreground' onClick={() => shadd.prompt(
                            'edit app information',
                            'you may not be able to change this in the future',
                            [
                                { placeholder: 'name', defaultValue: app.name, minLength: 2, maxLength: 24 },
                                {
                                    placeholder: 'url',
                                    minLength: 12,
                                    maxLength: 100,
                                    defaultValue: app.url,
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
                            (name: string, url: string) => api.v1.apps.patch({ id: app.id, name, url }).then((res) => {
                                if (res.data) (fetchApp(), shadd.close());
                                else alert('failed to update app :(');
                            })
                        )}>
                            <Pencil className='size-3.5' />
                        </Button>

                        <Button variant='ghost' className='h-8 gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive' onClick={() => shadd.confirm(
                            `delete "${app.name}"`,
                            'this action cannot be undone...are you sure you want to delete this app?',
                            () => {
                                if (!app.id) return;

                                api.v1.apps.delete.post({ id: app.id }).then((res) => {
                                    if (res.data) (navigate('/home'), shadd.close());
                                    else alert('failed to delete app :(');
                                });
                            }
                        )}>
                            <Trash className='size-3.5' />
                        </Button>
                    </div>
                </CardContent>

                <Separator />

                <CardContent className='py-0.5'>

                    <p>
                        <span className='font-semibold'>client ID:</span>

                        <Tooltip>
                            <TooltipTrigger>
                                <span className='underline cursor-pointer ml-1' onClick={() => {
                                    setCopied('clientID');
                                    navigator.clipboard.writeText(app.id);
                                    setTimeout(() => setCopied(''), 2000);
                                }}>{app.id}</span>
                            </TooltipTrigger>

                            <TooltipContent>
                                {copied === 'clientID' ? 'copied!' : 'click to copy'}
                            </TooltipContent>
                        </Tooltip>
                    </p>

                    <p>
                        <span className='font-semibold'>client secret:</span>

                        <Tooltip>
                            <TooltipTrigger>
                                <span className='underline cursor-pointer ml-1' onClick={() => {
                                    setCopied('clientSecret');
                                    navigator.clipboard.writeText(app.secret);
                                    setTimeout(() => setCopied(''), 2000);
                                }}>{app.secret.slice(0, 4)}...</span>
                            </TooltipTrigger>

                            <TooltipContent>
                                {copied === 'clientSecret' ? 'copied!' : 'click to copy'}
                            </TooltipContent>
                        </Tooltip>
                    </p>
                </CardContent>

                <Separator />

                <CardContent className='space-y-1'>
                    <p className='font-semibold'>redirect URIs:</p>
                    <div className='space-y-2 mt-2'>
                        {editedURIs.map((uri, i) => (
                            <div key={i} className='flex items-center gap-2'>
                                <Link className='w-4 h-4 text-muted-foreground cursor-pointer' onClick={() => navigator.clipboard.writeText(`${location.origin}/oauth/v1?client_id=${app.id}&redirect_uri=${encodeURIComponent(uri)}`)} />

                                <Input
                                    value={uri}
                                    onChange={(e) => {
                                        const updated = [...editedURIs];
                                        updated[i] = e.target.value;
                                        setEditedURIs(updated);

                                        api.v1.apps.redirectURIs.post({ id: app.id, uris: updated }).then((res) => {
                                            if (!res.data) alert('failed to fetch app :(');
                                        });
                                    }}
                                    className='flex items-center justify-between px-3 py-2 rounded-md bg-secondary/60 group cursor-pointer max-w-[calc(100%-10px)]'
                                />

                                <X className='w-4 h-4 text-muted-foreground cursor-pointer' onClick={() => {
                                    const newURIs = editedURIs.filter((_, j) => j !== i);
                                    api.v1.apps.redirectURIs.post({ id: app.id, uris: newURIs }).then((res) => {
                                        if (res.data) fetchApp();
                                        else alert('failed to fetch app :(');
                                    });
                                }} />
                            </div>
                        ))}

                        <div className='flex items-center gap-2'>
                            <span className='w-4 h-4' />

                            <Input
                                value={newURI}
                                onChange={(e) => setNewURI(e.target.value)}
                                placeholder='https://...'
                                className='flex items-center justify-between px-3 py-2 rounded-md bg-secondary/60 group cursor-pointer max-w-[calc(100%-10px)]'
                            />

                            <Plus className='w-4 h-4 text-muted-foreground cursor-pointer' onClick={() => {
                                if (!newURI) return;
                                const updated = [...editedURIs, newURI];
                                api.v1.apps.redirectURIs.post({ id: app.id, uris: updated }).then((res) => {
                                    if (res.data) {
                                        setNewURI('');
                                        fetchApp();
                                    } else alert('failed to fetch app :(');
                                });
                            }} />
                        </div>
                    </div>
                </CardContent>

                <Separator />

                <CardContent>
                    <Button variant='outline' className='w-full text-xs h-8 text-muted-foreground mt-1.5' onClick={() => navigate('/home')}>
                        go home
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}