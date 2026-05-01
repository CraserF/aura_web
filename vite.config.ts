import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

function rawScaffoldCss() {
  return {
    name: 'raw-scaffold-css',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (source === 'virtual:presentation-scaffold-css/executive-editorial-v1') {
        return source;
      }
      if (source === 'virtual:artifact-pack-css/presentation-editorial-stage-v1') {
        return source;
      }
      if (source === 'virtual:artifact-pack-css/document-executive-memo-v1') {
        return source;
      }
      if (
        !(
          importer?.includes('/src/services/presentationScaffolds/')
          || importer?.includes('/src/services/artifactPacks/')
        ) || !source.endsWith('.css?raw')
      ) {
        return null;
      }
      return `${resolve(dirname(importer), source.replace('?raw', ''))}?scaffold-raw-css`;
    },
    load(id: string) {
      if (id === 'virtual:presentation-scaffold-css/executive-editorial-v1') {
        const filePath = resolve(__dirname, 'src/services/presentationScaffolds/packs/executive-editorial-v1/style.css');
        return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
      }
      if (id === 'virtual:artifact-pack-css/presentation-editorial-stage-v1') {
        const filePath = resolve(__dirname, 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/style.css');
        return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
      }
      if (id === 'virtual:artifact-pack-css/document-executive-memo-v1') {
        const filePath = resolve(__dirname, 'src/services/artifactPacks/packs/document/executive-memo-v1/style.css');
        return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
      }
      if (!id.endsWith('?scaffold-raw-css')) {
        return null;
      }
      const filePath = id.slice(0, -'?scaffold-raw-css'.length);
      return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
    },
  };
}

export default defineConfig({
  plugins: [rawScaffoldCss(), react(), tailwindcss()],
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
          if (
            id.includes('node_modules/@mdxeditor/') ||
            id.includes('node_modules/lexical/') ||
            id.includes('node_modules/@lexical/') ||
            id.includes('node_modules/mdast-util-') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/unified/') ||
            id.includes('node_modules/remark-') ||
            id.includes('node_modules/rehype-')
          ) {
            return 'document-editor-runtime';
          }
          if (
            id.includes('node_modules/html2pdf.js/') ||
            id.includes('node_modules/html2canvas/') ||
            id.includes('node_modules/jspdf/')
          ) {
            return 'document-pdf-runtime';
          }
          if (id.includes('node_modules/docx/')) {
            return 'document-docx-runtime';
          }
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // Keep lazily requested raw knowledge/template assets out of the main AI chunk.
          if (
            id.includes('/src/services/ai/knowledge/') ||
            id.includes('/src/services/ai/templates/html/')
          ) {
            return undefined;
          }
          // App AI layer (workflow, prompts, orchestration)
          if (id.includes('/src/services/ai/')) {
            return 'ai-layer';
          }
        },
      },
    },
  },
});
