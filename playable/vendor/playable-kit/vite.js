// Vite config factory for the playable single-file build. A game's
// vite.playable.config.js stays ~5 lines and only declares what is genuinely
// per-game (entry html, extra plugins like react, defines like __PLAYABLE__):
//
//   import { playableConfig } from 'playable-kit/vite';
//   import react from '@vitejs/plugin-react';
//   export default playableConfig({
//     entry: 'playable.html',
//     plugins: [react()],
//     define: { __PLAYABLE__: 'true' },
//   });
//
// vite-plugin-singlefile inlines every JS/CSS chunk into the HTML. It does NOT
// touch runtime asset fetches (public/-relative GLBs, mp3s, textures) — those
// are embedded afterwards by build.js from the game's asset manifest.
import { viteSingleFile } from 'vite-plugin-singlefile';

export function playableConfig({ entry, plugins = [], define = {}, outDir = 'dist-playable' } = {}) {
  if (!entry) throw new Error('playableConfig: `entry` (the playable html) is required');
  return {
    plugins: [...plugins, viteSingleFile()],
    define,
    base: './',
    build: {
      target: 'es2020',
      outDir,
      // singlefile inlines everything anyway; silence chunk-size warning noise
      chunkSizeWarningLimit: 4000,
      rollupOptions: { input: entry },
    },
  };
}
