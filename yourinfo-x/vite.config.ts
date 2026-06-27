import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. The dev server proxies /api and /.netlify to netlify dev
// when running `netlify dev`, so in development the functions resolve locally.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
