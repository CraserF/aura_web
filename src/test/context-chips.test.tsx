import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContextChips } from '@/components/ContextChips';
import { createDefaultContextSelectionState, type ContextBundle } from '@/services/context/types';

function renderContextChips(
  selectionState = createDefaultContextSelectionState(),
  lastContext: ContextBundle | null = null,
): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ContextChips
        selectionState={selectionState}
        lastContext={lastContext}
        onOpen={vi.fn()}
      />,
    );
  });

  return { container, root };
}

describe('ContextChips simplified default state', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows one compact context button for the default state', () => {
    const view = renderContextChips();

    expect(document.body.textContent).toContain('Context');
    expect(document.body.textContent).not.toContain('Scope:');
    expect(document.body.textContent).not.toContain('Pins:');
    expect(document.body.textContent).not.toContain('Excluded:');
    expect(document.body.textContent).not.toContain('Compaction:');

    act(() => view.root.unmount());
    view.container.remove();
  });

  it('reveals only non-default context details', () => {
    const view = renderContextChips({
      ...createDefaultContextSelectionState(),
      pinnedDocumentIds: ['deck-1'],
      excludedSourceIds: ['source-1'],
    });

    expect(document.body.textContent).toContain('Context adjusted');
    expect(document.body.textContent).toContain('Pins: 1');
    expect(document.body.textContent).toContain('Excluded: 1');
    expect(document.body.textContent).not.toContain('Scope: auto');
    expect(document.body.textContent).not.toContain('Compaction: auto');

    act(() => view.root.unmount());
    view.container.remove();
  });
});
