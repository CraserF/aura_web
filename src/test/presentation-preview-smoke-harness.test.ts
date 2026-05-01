import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SMOKE_HTML_PATH = 'src/test/browser/presentation-preview-smoke.html';
const SMOKE_RUNNER_PATH = 'scripts/run-presentation-preview-smoke.mjs';

describe('presentation preview browser smoke harness', () => {
  it('uses the real Editorial Stage compiler and preview persistence path', () => {
    const html = readFileSync(SMOKE_HTML_PATH, 'utf8');

    expect(html).toContain('/src/services/artifactPacks/packs/presentation/editorial-stage-v1/compiler.ts');
    expect(html).toContain('/src/services/artifactPreview/presentationPreview.ts');
    expect(html).toContain('/src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json?raw');
    expect(html).toContain('/src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/media.json?raw');
    expect(html).toContain('compileEditorialStagePack({');
    expect(html).toContain('createPresentationArtifactPreview({');
    expect(html).toContain('upsertProjectArtifactPreview(project, documentId, preview)');
    expect(html).toContain('media/artifacts/browser-preview-smoke-deck/artifact.preview.png');
    expect(html).toContain('data:image/png;base64,');
  });

  it('documents the browser automation entrypoint without adding a package script choice', () => {
    const runner = readFileSync(SMOKE_RUNNER_PATH, 'utf8');

    expect(runner).toContain('src/test/browser/presentation-preview-smoke.html');
    expect(runner).toContain('npm');
    expect(runner).toContain('run');
    expect(runner).toContain('dev');
    expect(runner).toContain('--strictPort');
    expect(runner).toContain('--headless=new');
    expect(runner).toContain('--dump-dom');
    expect(runner).toContain('AURA_PREVIEW_SMOKE_PORT');
    expect(runner).toContain('CHROME_BIN');
  });
});
