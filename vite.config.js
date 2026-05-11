import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize for Vercel/Render free tiers
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
    // Report compressed sizes
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  // Env variable prefix
  envPrefix: 'VITE_',
});
