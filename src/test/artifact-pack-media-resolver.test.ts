import { describe, expect, it } from 'vitest';

import { createProjectMediaResolver } from '@/services/artifactPacks';
import type { ProjectMediaAsset } from '@/types/project';

const media: ProjectMediaAsset[] = [
  {
    id: 'hero-shot',
    filename: 'hero-shot.png',
    mimeType: 'image/png',
    relativePath: 'media/hero-shot.png',
    dataUrl: 'data:image/png;base64,hero',
  },
  {
    id: 'proof-shot',
    filename: 'proof-shot.jpg',
    mimeType: 'image/jpeg',
    relativePath: './media/proof-shot.jpg',
    dataUrl: 'data:image/jpeg;base64,proof',
  },
  {
    id: 'unsafe',
    filename: 'unsafe.png',
    mimeType: 'image/png',
    relativePath: '../unsafe.png',
    dataUrl: 'data:image/png;base64,unsafe',
  },
  {
    id: 'wrong-data-type',
    filename: 'wrong-data-type.png',
    mimeType: 'image/png',
    relativePath: 'media/wrong-data-type.png',
    dataUrl: 'data:text/html;base64,PGgxPk5vdCBpbWFnZTwvaDE+',
  },
  {
    id: 'wrong-mime',
    filename: 'wrong-mime.png',
    mimeType: 'text/html',
    relativePath: 'media/wrong-mime.png',
    dataUrl: 'data:text/html;base64,PGgxPk5vdCBpbWFnZTwvaDE+',
  },
];

describe('artifact pack media resolver', () => {
  it('resolves project media by asset id and normalized media path', () => {
    const resolver = createProjectMediaResolver(media);

    expect(resolver.resolveById('hero-shot')?.url).toBe('data:image/png;base64,hero');
    expect(resolver.resolveByRelativePath('./media/proof-shot.jpg')?.id).toBe('proof-shot');
    expect(resolver.resolveByRelativePath('media/proof-shot.jpg')?.mimeType).toBe('image/jpeg');
    expect(resolver.list().map((asset) => asset.id)).toEqual(['hero-shot', 'proof-shot']);
  });

  it('rejects paths outside the project media namespace', () => {
    const resolver = createProjectMediaResolver(media);

    expect(resolver.resolveById('unsafe')).toBeNull();
    expect(resolver.resolveByRelativePath('../unsafe.png')).toBeNull();
    expect(resolver.resolveByRelativePath('documents/brief.pdf')).toBeNull();
  });

  it('rejects non-image and mismatched data URLs before pack compilation', () => {
    const resolver = createProjectMediaResolver(media);

    expect(resolver.resolveById('wrong-data-type')).toBeNull();
    expect(resolver.resolveById('wrong-mime')).toBeNull();
    expect(resolver.list().map((asset) => asset.id)).toEqual(['hero-shot', 'proof-shot']);
  });
});
