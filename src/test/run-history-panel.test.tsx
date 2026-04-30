import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RunHistoryPanel } from '@/components/RunHistoryPanel';
import { clearRunOutputBuffers, writeRunOutputBuffer } from '@/services/runs/outputBuffer';
import {
  clearRunRegistry,
  createRunRecord,
  setRunOutputSummary,
  updateRunRecordStatus,
} from '@/services/runs/registry';

const baseIntent = {
  artifactType: 'document' as const,
  operation: 'create' as const,
  scope: 'project' as const,
  targetSelectors: [],
  allowFullRegeneration: false,
  confidence: 0.99,
  needsClarification: false,
  reason: 'test run history',
};

function renderPanel(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<RunHistoryPanel open onOpenChange={() => {}} />);
  });

  return { container, root };
}

describe('RunHistoryPanel advanced diagnostics', () => {
  beforeEach(() => {
    clearRunRegistry();
    clearRunOutputBuffers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    clearRunRegistry();
    clearRunOutputBuffers();
    document.body.innerHTML = '';
  });

  it('renders quality diagnostics only inside the advanced run-history section', () => {
    createRunRecord('run-advanced', baseIntent);
    updateRunRecordStatus('run-advanced', 'completed');
    writeRunOutputBuffer('output-run-advanced', 'Document updated.', {
      structuredStatus: {
        title: 'Done',
        detail: 'Document updated.',
        advancedDiagnostics: [
          'Quality blocked by 1 issue across Typography.',
          'Advisory issue across Mobile layout.',
        ],
      },
      outputs: {},
    });
    setRunOutputSummary('run-advanced', 'Document updated.', 'output-run-advanced');

    const view = renderPanel();

    expect(document.body.textContent).toContain('Summary');
    expect(document.body.textContent).toContain('Document updated.');
    expect(document.body.textContent).toContain('Advanced diagnostics');
    expect(document.body.textContent).toContain('Quality blocked by 1 issue across Typography.');
    expect(document.body.textContent).toContain('Advisory issue across Mobile layout.');

    act(() => {
      view.root.unmount();
    });
    view.container.remove();
  });

  it('renders runtime phase timings from the output buffer', () => {
    createRunRecord('run-timing', { ...baseIntent, artifactType: 'presentation' });
    updateRunRecordStatus('run-timing', 'completed');
    writeRunOutputBuffer('output-run-timing', 'Presentation created.', {
      structuredStatus: {
        title: 'Done',
        detail: 'Presentation created.',
      },
      outputs: {
        runtime: {
          phaseTimings: [
            { phaseId: 'planning', label: 'Planning', durationMs: 42, order: 0 },
            { phaseId: 'slide', label: 'Slide 1', durationMs: 1280, partId: 'slide-1', order: 1 },
          ],
        },
      },
    });
    setRunOutputSummary('run-timing', 'Presentation created.', 'output-run-timing');

    const view = renderPanel();

    expect(document.body.textContent).toContain('Timing');
    expect(document.body.textContent).toContain('Planning');
    expect(document.body.textContent).toContain('42ms');
    expect(document.body.textContent).toContain('Slide 1 (slide-1)');
    expect(document.body.textContent).toContain('1.3s');

    act(() => {
      view.root.unmount();
    });
    view.container.remove();
  });
});
