import { createRoot } from 'react-dom/client'
import { Route, Switch } from 'wouter'

import { ShaddProvider } from './lib/shadd.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'

import Landing from './components/routes/Landing.tsx'
import Auth from './components/routes/Auth.tsx'

import Home from './components/routes/home/Home.tsx'
import Apps from './components/routes/home/apps/Apps.tsx'
import App from './components/routes/home/apps/[id]/App.tsx'

import V1 from './components/routes/oauth/V1.tsx'

import './global.css'

createRoot(document.getElementById('root')!).render(<TooltipProvider>
    <Switch>
        <Route path='/' component={Landing} />

        <Route path='/auth/login'><Auth act='login' /></Route>
        <Route path='/auth/join'><Auth act='join' /></Route>

        <Route path='/home' component={Home} />
        <Route path='/home/apps' component={Apps} />
        <Route path='/home/apps/:id' component={App} />

        <Route path='/oauth/v1' component={V1} />
    </Switch>

    <ShaddProvider />
</TooltipProvider>)