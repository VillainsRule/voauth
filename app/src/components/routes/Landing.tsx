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
                <h1 className='text-5xl font-bold tracking-tight'>voauth</h1>
                <h2 className='text-base text-muted-foreground font-medium text-center'>the unified auth system for (most) of my projects</h2>
            </div>

            {window.props.user ? <div className='relative flex gap-2 mt-2'>
                <Button variant='outline' onClick={() => navigate('/home')}>open dashboard</Button>
            </div> : <div className='relative flex gap-2 mt-2'>
                <Button variant='outline' onClick={() => navigate('/auth/login')}>login</Button>
                <Button onClick={() => navigate('/auth/join')}>create account</Button>
            </div>}
        </div>
    )
}