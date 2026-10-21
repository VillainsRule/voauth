import { createRoot } from 'react-dom/client'
import { Route, Switch } from 'wouter'

import { ShaddProvider } from './lib/shadd.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'

import Landing from './components/routes/Landing.tsx'
import Auth from './components/routes/Auth.tsx'

import Home from './components/routes/home/Home.tsx'
import App from './components/routes/home/apps/[id]/App.tsx'

import V1 from './components/routes/oauth/V1.tsx'

import './global.css'

createRoot(document.getElementById('root')!).render(<TooltipProvider>
    <Switch>
        <Route path='/' component={Landing} />

        <Route path='/auth/login'><Auth act='login' /></Route>
        <Route path='/auth/join'><Auth act='join' /></Route>

        <Route path='/home' component={Home} />
        <Route path='/home/apps/:id' component={App} />

        <Route path='/oauth/v1' component={V1} />

        <Route path='*'>
            <div className='flex flex-col justify-center items-center gap-2 h-screen w-screen'>
                <h1 className='text-4xl font-extrabold tracking-tight text-primary'>voauth</h1>
                <h2>404 not found</h2>
            </div>
        </Route>
    </Switch>

    <ShaddProvider />
</TooltipProvider>)