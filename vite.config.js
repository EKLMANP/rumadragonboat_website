import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'RUMA 龍舟隊',
        short_name: 'RUMA',
        description: 'RUMA 龍舟隊專屬應用程式',
        theme_color: '#ea580c', // RUMA Orange
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/app/practice',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        maximumFileSizeToCacheInBytes: 5000000 // 5MB limit for JS/CSS/etc just in case
      }
    })
  ],
})
