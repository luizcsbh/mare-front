import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'pwa-icon-180.png', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: 'Maré — Saúde pessoal',
        short_name: 'Maré',
        description: 'Acompanhamento pessoal de medidas, exames e atividades físicas.',
        lang: 'pt-BR',
        id: '/',
        theme_color: '#173d3b',
        background_color: '#f2f5f0',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': 'http://localhost:3001' } },
});
