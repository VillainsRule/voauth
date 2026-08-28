import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardHeader } from '@/components/ui/card';

import { Check, Copy } from 'lucide-react';

import api from '@/lib/eden';

export default function UserHeader() {
    const [copyEl, setCopyEl] = useState('');

    return (
        <CardHeader className='pb-px'>
            <div className='flex items-start justify-between'>
                <div>
                    <p className='text-lg font-semibold tracking-tight'>voauth</p>
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

                <Button variant='destructive' size='sm' className='text-xs h-7'
                    onClick={() => api.auth.logout.post().then(() => location.href = '/auth/login')}>
                    logout
                </Button>
            </div>
        </CardHeader>
    )
}