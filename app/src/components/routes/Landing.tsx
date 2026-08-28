import { useLocation } from 'wouter';

import { Button } from '../ui/button.tsx';

export default function Landing() {
    const [, navigate] = useLocation();

    return (
        <div className='relative flex flex-col items-center justify-center h-screen w-screen gap-3 overflow-hidden bg-background'>
            <div
                className='absolute inset-0'
                style={{
                    backgroundImage: `linear-gradient(rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.2) 1px, transparent 1px)`,
                    backgroundSize: '48px 48px',
                    maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, black 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, black 100%)',
                }}
            />

            <div className='relative flex flex-col items-center gap-1'>
                <h1 className='text-7xl font-bold tracking-tighter'>voauth</h1>
                <h2 className='text-lg text-muted-foreground font-medium text-center max-w-xs'>a unified auth system.</h2>
            </div>

            <div className='relative flex gap-3'>
                <Button variant='outline' size='lg' onClick={() => navigate('/auth/login')}>login</Button>
                <Button size='lg' onClick={() => navigate('/auth/join')}>create account</Button>
            </div>
        </div>
    )
}