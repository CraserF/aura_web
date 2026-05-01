import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/artifactPacks', () => ({
  listArtifactPackGalleryItems: () => [
    {
      packId: 'presentation/editorial-stage-v1',
      version: '1.0.0',
      label: 'Editorial Stage',
      description: 'Presentation pack for staged editorial narratives.',
      status: 'draft',
      artifactType: 'presentation',
      bestFor: ['strategy narratives', 'board updates'],
      supportedOutputModes: ['html', 'pdf', 'editable-pptx'],
      supportedDirectionLabels: ['Editorial Magazine', 'Modern Minimal'],
      layoutFamilies: ['cover'],
      examples: [
        {
          id: 'decision-brief-example',
          label: 'Decision Brief Example',
          sourcePath: 'examples/source.json',
          compiledPath: 'examples/example.html',
          previewPath: 'examples/preview.png',
          resolvedSourcePath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json',
          resolvedCompiledPath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/example.html',
          resolvedPreviewPath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/preview.png',
          previewKind: 'image',
        },
      ],
      primaryExample: {
        id: 'decision-brief-example',
        label: 'Decision Brief Example',
        sourcePath: 'examples/source.json',
        compiledPath: 'examples/example.html',
        previewPath: 'examples/preview.png',
        resolvedSourcePath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json',
        resolvedCompiledPath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/example.html',
        resolvedPreviewPath: 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/preview.png',
        previewKind: 'image',
      },
      saveAsPackAvailable: false,
    },
    {
      packId: 'spreadsheet/operating-model-v1',
      version: '1.0.0',
      label: 'Operating Model',
      description: 'Workbook pack for operating metrics.',
      status: 'shippable',
      artifactType: 'spreadsheet',
      bestFor: ['planning workbook'],
      supportedOutputModes: ['xlsx', 'csv'],
      supportedDirectionLabels: ['Data Utility'],
      layoutFamilies: ['inputs'],
      examples: [],
      saveAsPackAvailable: false,
    },
  ],
}));

import { ArtifactLibraryDialog } from '@/components/ArtifactLibraryDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderDialog(): { unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<ArtifactLibraryDialog open onOpenChange={() => {}} />);
  });

  return {
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ArtifactLibraryDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders artifact pack gallery metadata from registry manifests', () => {
    const view = renderDialog();

    expect(document.body.textContent).toContain('Artifact library');
    expect(document.body.textContent).toContain('Editorial Stage');
    expect(document.body.textContent).toContain('presentation');
    expect(document.body.textContent).toContain('draft');
    expect(document.body.textContent).toContain('strategy narratives');
    expect(document.body.textContent).toContain('Editorial Magazine, Modern Minimal');
    expect(document.body.textContent).toContain('html, pdf, editable-pptx');
    expect(document.body.textContent).toContain('Decision Brief Example');
    expect(document.body.textContent).toContain('src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/example.html');
    expect(document.body.textContent).toContain('src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/preview.png');
    expect(document.body.textContent).toContain('(image)');
    expect(document.body.textContent).toContain('Operating Model');
    expect(document.body.textContent).toContain('No compiled examples registered yet.');
    expect(document.body.textContent).toContain('Save as pack deferred');

    const deferredButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Save as pack deferred'));
    expect(deferredButton).toBeInstanceOf(HTMLButtonElement);
    expect(deferredButton).toBeDisabled();

    view.unmount();
  });
});
