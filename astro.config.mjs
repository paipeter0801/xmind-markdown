import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://astro.build/config
export default defineConfig({
  // 部署到 GitHub Pages 子路徑
  base: '/xmind-markdown',
  integrations: [
    svelte(),
  ],
  vite: {
    plugins: [
      tailwindcss({
        darkMode: 'class',
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        manifest: {
          name: 'XMind to Markdown',
          short_name: 'XMind2MD',
          description: 'Convert XMind files to Markdown with real-time preview',
          theme_color: '#0ea5e9',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'font-cache',
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              }
            }
          ]
        }
      })
    ]
  }
})
