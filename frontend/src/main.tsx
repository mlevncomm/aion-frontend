import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/v2.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

// Registering the worker is what makes AION installable as a desktop app.
// It is deliberately registered after load so it never competes with the first
// paint, and an updated worker takes over immediately rather than leaving the
// owner on a build that was already replaced.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js?release=20260922-v3', { updateViaCache: 'none' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing
        if (!next) return
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) next.postMessage('skip-waiting')
        })
      })
    }).catch(() => undefined)

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      if (sessionStorage.getItem('aion-sw-v2-reloaded') === '1') return
      refreshing = true
      sessionStorage.setItem('aion-sw-v2-reloaded', '1')
      window.location.reload()
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
