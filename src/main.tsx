import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './theme-tokens.css'
import './index.css'
import './theme-aurora.css'
import App from './App.tsx'
import { AnalyticsConsent } from './components/AnalyticsConsent.tsx'
import { InstallPrompt } from './components/InstallPrompt.tsx'
import { initAnalytics } from './lib/analytics.ts'
import { initTheme } from './lib/theme.ts'
import UpdateBanner from './UpdateBanner.tsx'

initAnalytics()
initTheme()

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
