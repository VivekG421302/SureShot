import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 17. Build config: Vite runs the React app in development and bundles it for deployment.
export default defineConfig({
  // 17A. React plugin enables JSX, Fast Refresh, and React-specific build transforms.
  plugins: [react()],
  build: {
    // 17B. Optimize output for Vercel/Render free tiers.
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // 17B(i). Split vendor chunks for better browser caching.
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
    // 17B(ii). Report compressed sizes after build so bundle weight is visible.
    reportCompressedSize: true,
  },
  server: {
    // 17C. Dev server runs on Vite's default port and is reachable on the local network.
    port: 5173,
    host: true,
  },
  // 17D. Only variables prefixed with VITE_ are exposed to browser code.
  envPrefix: 'VITE_',
});
