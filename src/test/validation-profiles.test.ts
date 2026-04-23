import { describe, expect, it } from 'vitest';

import {
  buildValidationResult,
  createValidationIssue,
  getDefaultValidationProfileId,
} from '@/services/validation/profiles';

describe('validation profiles', () => {
  it('returns the correct default profile for each artifact type', () => {
    expect(getDefaultValidationProfileId('document')).toBe('document-standard');
    expect(getDefaultValidationProfileId('presentation')).toBe('presentation-standard');
    expect(getDefaultValidationProfileId('spreadsheet')).toBe('spreadsheet-standard');
  });

  it('promotes strict warning codes to blocking issues for publish-ready', () => {
    const result = buildValidationResult(
      'publish-ready',
      [{ documentId: 'doc-1', artifactType: 'document' }],
      [createValidationIssue('warning', 'style-block', 'Missing style block.', { targetDocumentId: 'doc-1' })],
    );

    expect(result.passed).toBe(false);
    expect(result.blockingIssues).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(result.blockingIssues[0]?.code).toBe('style-block');
  });
});
