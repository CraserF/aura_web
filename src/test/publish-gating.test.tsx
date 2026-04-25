import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublishPanel } from '@/components/PublishPanel';
import type { ValidationResult } from '@/services/validation/types';

function makeValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    passed: false,
    blockingIssues: [{ code: 'style-block', message: 'Missing style block.', severity: 'blocking' }],
    warnings: [],
    score: 72,
    profileId: 'publish-ready',
    artifactTargets: [{ documentId: 'doc-1', artifactType: 'document' }],
    ...overrides,
  };
}

function renderPanel(onConfirm: () => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
      <PublishPanel
        open
        onOpenChange={() => {}}
        actionLabel="Export PDF"
        artifactValidation={makeValidationResult()}
        projectValidation={null}
        onConfirm={onConfirm}
      />,
    );
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('publish gating panel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('surfaces an explicit override action when export is blocked', () => {
    const onConfirm = vi.fn();
    const view = renderPanel(onConfirm);
    const buttons = Array.from(document.querySelectorAll('button'));
    const override = buttons.find((button) => button.textContent?.includes('Override and export'));

    expect(override).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (override as HTMLButtonElement).click();
    });

    expect(onConfirm).toHaveBeenCalledOnce();
    view.unmount();
  });
});
