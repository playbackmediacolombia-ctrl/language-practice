import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths so the site works under any GitHub Pages sub-path.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Language Practice',
        short_name: 'Languages',
        description: 'Spanish, French and Mandarin phrase practice',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F6F4EF',
        theme_color: '#F6F4EF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell + all phrase audio work offline. The ONNX runtime and Whisper model are
        // cached separately by transformers.js, so they are left out here.
        globPatterns: ['**/*.{js,css,html,png,mp3}'],
        globIgnores: ['ort/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  // Lessons (shared/), audio (assets/audio/) and the matching code are shared with the native app.
  // Resolve their npm imports from web/node_modules so the build doesn't need the native app's.
  resolve: { dedupe: ['pinyin-pro'] },
  server: { fs: { allow: ['..'] } },
  worker: { format: 'es' },
});
