import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://astro.build/config
export default defineConfig({
  // 掛載於 AI GoEZ 母站子路徑 /xmind-markdown/（亦相容 GitHub Pages project path）
  base: '/xmind-markdown/',
  integrations: [
    svelte(),
  ],
  vite: {
    plugins: [
      tailwindcss({
        darkMode: 'class',
      }),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        manifest: {
          name: 'AI GoEZ · XMind ⇄ Markdown',
          short_name: 'AI GoEZ',
          description: 'AI GoEZ 出品：免費、隱私、離線的 XMind 8 ⇄ Markdown 雙向轉換器',
          theme_color: '#0ea5e9',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icons/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
        }
      })
    ]
  }
})
