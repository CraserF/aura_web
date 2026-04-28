import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const server = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: {
    hmr: false,
    middlewareMode: true,
    ws: false,
  },
});

try {
  await server.ssrLoadModule('/scripts/benchmark-ollama.ts');
} finally {
  await server.close();
}
