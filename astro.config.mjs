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
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
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
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
        }
      })
    ]
  }
})
