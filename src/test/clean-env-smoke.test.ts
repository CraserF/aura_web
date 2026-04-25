import { describe, expect, it, vi } from 'vitest';

const saveAsMock = vi.hoisted(() => vi.fn());

vi.mock('file-saver', () => ({
  saveAs: saveAsMock,
}));

describe('clean environment smoke checks', () => {
  it('loads export runtimes and smoke helpers without clean-env blocking failures', async () => {
    const [{ prepareDocumentPdfMarkup }, { exportDocumentDocx }, { runCleanEnvironmentChecks }] = await Promise.all([
      import('@/services/export/pdf'),
      import('@/services/export/docx'),
      import('@/services/validation/cleanEnv'),
    ]);

    const prepared = prepareDocumentPdfMarkup('<div class="doc-shell"><h1>Smoke</h1><p>Ready</p></div>', 'Smoke');
    expect(prepared.documentMarkup).toContain('aura-pdf-page');

    await exportDocumentDocx({
      title: 'Smoke',
      markdown: '# Smoke\n\nReady',
    });
    expect(saveAsMock).toHaveBeenCalledOnce();

    const issues = await runCleanEnvironmentChecks();
    expect(issues.filter((issue) => issue.severity === 'blocking')).toEqual([]);
  });
});
