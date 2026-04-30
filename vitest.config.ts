import { defineConfig } from 'vitest/config';
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
      if (!id.endsWith('?scaffold-raw-css')) {
        return null;
      }
      const filePath = id.slice(0, -'?scaffold-raw-css'.length);
      return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
    },
  };
}

export default defineConfig({
  plugins: [rawScaffoldCss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
