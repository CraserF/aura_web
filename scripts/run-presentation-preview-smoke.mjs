#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.AURA_PREVIEW_SMOKE_PORT ?? 5197);
const host = '127.0.0.1';
const smokePath = '/src/test/browser/presentation-preview-smoke.html';
const smokeUrl = `http://${host}:${port}${smokePath}`;
const serverReadyUrl = `http://${host}:${port}/`;
const timeoutMs = Number(process.env.AURA_PREVIEW_SMOKE_TIMEOUT_MS ?? 120_000);
const chromeTimeoutMs = Number(process.env.AURA_PREVIEW_SMOKE_CHROME_TIMEOUT_MS ?? 45_000);

function npmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function chromeCandidates() {
  return [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
}

function resolveChromeBin() {
  const chromeBin = chromeCandidates().find((candidate) => existsSync(candidate));
  if (!chromeBin) {
    throw new Error('Chrome was not found. Set CHROME_BIN to a Chrome or Chromium executable.');
  }
  return chromeBin;
}

async function waitForServer(url) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }

  throw new Error(`Vite dev server did not become ready in ${timeoutMs}ms.${lastError ? ` Last error: ${lastError.message}` : ''}`);
}

function collectProcessOutput(child, label) {
  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.on('error', (error) => {
    output += `\n[${label}] ${error.message}\n`;
  });
  return () => output;
}

async function runChrome(url, userDataDir) {
  const chromeBin = resolveChromeBin();
  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    `--user-data-dir=${userDataDir}`,
    '--virtual-time-budget=20000',
    '--dump-dom',
    url,
  ], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const getOutput = collectProcessOutput(chrome, 'chrome');
  let timedOut = false;
  let closed = false;
  let killTimer;
  const timeout = setTimeout(() => {
    timedOut = true;
    chrome.kill('SIGTERM');
    killTimer = setTimeout(() => {
      if (!closed) {
        chrome.kill('SIGKILL');
      }
    }, 2_000).unref();
  }, chromeTimeoutMs);

  const exitCode = await new Promise((resolveExit) => {
    chrome.on('close', (code) => {
      closed = true;
      resolveExit(code);
    });
  });
  clearTimeout(timeout);
  if (killTimer) clearTimeout(killTimer);
  const output = getOutput();
  if (timedOut) {
    if (/<pre[^>]*id=["']smoke-result["'][^>]*data-status=["']passed["']/i.test(output)) {
      return output;
    }
    throw new Error(`Chrome did not complete the preview smoke in ${chromeTimeoutMs}ms.\n${output}`);
  }
  if (exitCode !== 0) {
    throw new Error(`Chrome exited with code ${exitCode}.\n${output}`);
  }
  return output;
}

function decodeEntities(text) {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function parseSmokeResult(dom) {
  const match = dom.match(/<pre[^>]*id=["']smoke-result["'][^>]*>([\s\S]*?)<\/pre>/i);
  if (!match) {
    throw new Error(`Smoke result node was not found in Chrome DOM output.\n${dom.slice(0, 2000)}`);
  }
  return JSON.parse(decodeEntities(match[1].trim()));
}

async function main() {
  let serverExited = false;
  const server = spawn(npmBin(), [
    'run',
    'dev',
    '--',
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
  ], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  server.once('close', () => {
    serverExited = true;
  });
  const getServerOutput = collectProcessOutput(server, 'vite');
  const userDataDir = await mkdtemp(join(tmpdir(), 'aura-preview-smoke-'));

  try {
    await waitForServer(serverReadyUrl);
    const dom = await runChrome(smokeUrl, userDataDir);
    const result = parseSmokeResult(dom);

    if (result.status !== 'passed') {
      throw new Error(`Presentation preview smoke failed:\n${JSON.stringify(result, null, 2)}`);
    }
    if (result.mimeType !== 'image/png' || result.width !== 1280 || result.height !== 720) {
      throw new Error(`Presentation preview smoke produced invalid metadata:\n${JSON.stringify(result, null, 2)}`);
    }
    if (result.dataUrlPrefix !== 'data:image/png;base64,' || result.dataUrlLength < 1000) {
      throw new Error(`Presentation preview smoke produced invalid PNG data:\n${JSON.stringify(result, null, 2)}`);
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (!serverExited) {
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveKill) => server.once('close', resolveKill)),
        new Promise((resolveKill) => setTimeout(resolveKill, 5_000)),
      ]);
    }
    await rm(userDataDir, { recursive: true, force: true });

    const serverOutput = getServerOutput();
    if (serverOutput && process.env.AURA_PREVIEW_SMOKE_VERBOSE === '1') {
      console.error(serverOutput);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
