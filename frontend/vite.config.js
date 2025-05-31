import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {},
  },
  resolve: {
    alias: {
      util: require.resolve('util/'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser'),
    },
  },
  build: {
    rollupOptions: {
      plugins: [nodePolyfills()],
    },
  },
  server: {
    port: 5173,
  },
});