import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AnalyticsConsent } from './components/AnalyticsConsent.tsx'
import { InstallPrompt } from './components/InstallPrompt.tsx'
import { initAnalytics } from './lib/analytics.ts'
import UpdateBanner from './UpdateBanner.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <div className="toast-stack">
      <UpdateBanner />
      <AnalyticsConsent />
      <InstallPrompt />
    </div>
  </StrictMode>,
)
