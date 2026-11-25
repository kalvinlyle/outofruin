import { playableConfig } from 'playable-kit/vite';

const base = playableConfig({
  entry: 'playable.html',
  define: { __PLAYABLE__: 'true' },
});

export default {
  ...base,
  envFile: false,
  build: {
    ...base.build,
    assetsInlineLimit: 100_000_000,
  },
};
