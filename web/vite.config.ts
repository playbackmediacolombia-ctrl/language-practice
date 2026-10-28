import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Which commit this build is, shown in Settings and published as version.json (not cached by the
// service worker), so the live site can be checked against the latest commit.
const BUILD = {
  commit: process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD').toString().trim(),
  built: new Date().toISOString(),
};
/**
 * Recordings are grouped by language (audio/es/, audio/pt/…), plus audio/coach/ (the English
 * coach's lines) and audio/en/ (English meanings for hands-free). Only the app itself is
 * precached; each language's recordings download when you pick it (see lib/audioPacks.ts).
 */
function audioPack(file: string): string | null {
  const m = file.match(/assets\/audio\/(?:(course|stories|scenarios|chants|feedback|play)\/)?([a-z]{2})\/[^/]+\.mp3$/);
  if (!m) return null;
  return m[1] === 'feedback' && m[2] === 'en' ? 'coach' : m[2];
}
const PACKS = ['es', 'fr', 'zh', 'pt', 'it', 'coach', 'en'];

/** audio-packs.json: every pack's files and total size, for downloading and for Settings. */
const audioPacksFile = (): Plugin => ({
  name: 'audio-packs',
  generateBundle(_, bundle) {
    const packs: Record<string, { bytes: number; files: string[] }> = {};
    for (const file of Object.values(bundle)) {
      const pack = file.type === 'asset' && file.fileName.match(/^audio\/([a-z]+)\//)?.[1];
      if (!pack || file.type !== 'asset') continue;
      (packs[pack] ??= { bytes: 0, files: [] }).files.push(file.fileName);
      packs[pack].bytes += typeof file.source === 'string' ? file.source.length : file.source.byteLength;
    }
    this.emitFile({ type: 'asset', fileName: 'audio-packs.json', source: JSON.stringify(packs) });
  },
});

const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) + '\n' });
  },
});

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  // Relative paths so the site works under any GitHub Pages sub-path.
  base: './',
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: (info) => {
          const pack = info.originalFileNames.map(audioPack).find(Boolean);
          return pack ? `audio/${pack}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: [
    react(),
    versionFile(),
    audioPacksFile(),
    VitePWA({
      // A new version waits until you're not mid-lesson (see applyUpdateWhenIdle in lib/offline.ts).
      registerType: 'prompt',
      manifest: {
        id: './',
        name: 'Learnguage',
        short_name: 'Learnguage',
        description: 'Spanish, French, Mandarin, Portuguese and Italian practice',
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
        // The app shell, the characters' stroke data and the little feedback sounds work offline
        // from the start. Recordings are cached per language (below). The ONNX runtime and Whisper
        // model are cached separately by transformers.js, so they are left out here.
        globPatterns: ['**/*.{js,css,html,png,webp,woff2}', 'hanzi/*.json', 'feedback/*.mp3', 'audio-packs.json'],
        // Launch screens are only read by iOS when the app is added to the Home Screen.
        globIgnores: ['ort/**', 'splash/**', 'icons/icon-1024.png', 'audio/**'],
        // Each language's recordings: from its own cache once downloaded (or played once).
        runtimeCaching: PACKS.map((pack) => ({
          urlPattern: new RegExp(`/audio/${pack}/[^/]+\\.mp3$`),
          handler: 'CacheFirst' as const,
          options: { cacheName: `audio-${pack}`, rangeRequests: true, cacheableResponse: { statuses: [0, 200] } },
        })),
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
