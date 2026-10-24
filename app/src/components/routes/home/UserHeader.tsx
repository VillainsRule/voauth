import { useState } from 'preact/hooks';
import { navigate } from 'wouter-preact/use-browser-location';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardHeader } from '@/components/ui/card';

import { Check, Copy, LogOut } from 'lucide-react';

import api from '@/lib/eden';

export default function UserHeader() {
    const [copyEl, setCopyEl] = useState('');

    return (
        <CardHeader className='pb-px'>
            <div className='flex items-center justify-between'>
                <div>
                    <p className='text-lg font-semibold drop-shadow-sm cursor-pointer hover:underline' onClick={() => navigate('/home')}>voauth</p>

                    <p className='text-sm text-muted-foreground'>
                        @{window.props.user.username}

                        <Badge
                            variant='secondary'
                            className='rounded-sm cursor-pointer ml-1'
                            onClick={() => (setCopyEl('copy'), navigator.clipboard.writeText(window.props.user.id.toString()), setTimeout(() => setCopyEl(''), 2000))}
                        >
                            ID: {window.props.user.id} {copyEl === 'copy' ? <Check className='ml-px' /> : <Copy className='ml-px' />}
                        </Badge>
                    </p>
                </div>

                <div className='flex flex-col items-center gap-1'>
                    <Button variant='ghost' size='sm' className='h-8 gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                        onClick={() => api.auth.logout.post().then(() => location.href = '/auth/login')}>
                        <LogOut className='size-3.5' />
                        logout
                    </Button>
                </div>
            </div>
        </CardHeader>
    )
}