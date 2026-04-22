import { describe, expect, it } from 'vitest';

import { resolveChatWorkflowType } from '@/services/chat/routing';

describe('chat routing', () => {
  it('uses the active document type as the authoritative workflow', () => {
    expect(resolveChatWorkflowType('create a spreadsheet for revenue', 'presentation')).toBe('presentation');
    expect(resolveChatWorkflowType('make this a slide deck', 'document')).toBe('document');
  });

  it('falls back to prompt-based workflow detection when no document is active', () => {
    expect(resolveChatWorkflowType('create a spreadsheet for revenue')).toBe('spreadsheet');
    expect(resolveChatWorkflowType('write a quarterly report')).toBe('document');
    expect(resolveChatWorkflowType('build a keynote for launch day')).toBe('presentation');
  });
});
