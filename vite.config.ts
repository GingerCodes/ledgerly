import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Expose SB_URL and SB_ANON_KEY (no VITE_ prefix) to the client bundle.
  envPrefix: ['VITE_', 'SB_'],
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ledgerly Personal Finance Tracker',
        short_name: 'Ledgerly',
        description: 'A private, cloud-backed personal finance tracker.',
        theme_color: '#245c48',
        background_color: '#f5f7f4',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
