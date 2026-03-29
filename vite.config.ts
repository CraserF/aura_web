import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React runtime — must come before generic vendor check
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/reveal.js/')) {
            return 'reveal';
          }
          if (
            id.includes('node_modules/ai/') ||
            id.includes('node_modules/@ai-sdk/')
          ) {
            return 'ai-sdk';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix';
          }
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // App AI layer (knowledge docs + prompts) — large static text content
          if (id.includes('/src/services/ai/')) {
            return 'ai-layer';
          }
        },
      },
    },
  },
});
