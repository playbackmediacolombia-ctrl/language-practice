import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths so the site works under any GitHub Pages sub-path.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // A new version waits until you're not mid-lesson (see applyUpdateWhenIdle in lib/offline.ts).
      registerType: 'prompt',
      manifest: {
        id: './',
        name: 'Learnguage',
        short_name: 'Learnguage',
        description: 'Spanish, French and Mandarin phrase practice',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F8FF',
        theme_color: '#F4F8FF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          // Android crops these to a circle or squircle, so the art sits inside a safe zone.
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // On first install, take over the open page at once so it works offline straight away.
        // (Updates still wait for applyUpdateWhenIdle.)
        clientsClaim: true,
        // App shell, all phrase audio and the characters' stroke data work offline. The ONNX runtime and Whisper model are
        // cached separately by transformers.js, so they are left out here.
        globPatterns: ['**/*.{js,css,html,png,webp,mp3}', 'hanzi/*.json'],
        // Launch screens are only read by iOS when the app is added to the Home Screen.
        globIgnores: ['ort/**', 'splash/**', 'icons/icon-1024.png'],
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
