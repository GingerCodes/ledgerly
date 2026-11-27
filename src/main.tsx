import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { InstallPrompt } from './components/InstallPrompt.tsx'
import UpdateBanner from './UpdateBanner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <div className="toast-stack">
      <UpdateBanner />
      <InstallPrompt />
    </div>
  </StrictMode>,
)
