import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIWorkingIndicator } from '@/components/AIWorkingIndicator';
import { useChatStore } from '@/stores/chatStore';

function renderIndicator(): { container: HTMLDivElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<AIWorkingIndicator />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('AIWorkingIndicator runtime progress labels', () => {
  beforeEach(() => {
    useChatStore.getState().setStatus({ state: 'idle' });
  });

  afterEach(() => {
    useChatStore.getState().setStatus({ state: 'idle' });
  });

  it('shows slide-specific repair completion labels as workflow steps', () => {
    act(() => {
      useChatStore.getState().setStatus({
        state: 'generating',
        startedAt: Date.now(),
        step: 'Repairing slide 1 fragment.',
        steps: [
          { id: 'plan', label: 'Planning', status: 'done' },
          { id: 'design', label: 'Creating slides', status: 'done' },
          { id: 'slide-1', label: 'Repaired slide 1 fragment.', status: 'done' },
          { id: 'evaluate', label: 'Checking quality', status: 'pending' },
          { id: 'finalize', label: 'Finishing', status: 'pending' },
        ],
      });
    });

    const view = renderIndicator();

    expect(view.container.textContent).toContain('Repairing slide 1 fragment.');
    expect(view.container.textContent).toContain('Repaired slide 1 fragment.');

    view.unmount();
  });
});
