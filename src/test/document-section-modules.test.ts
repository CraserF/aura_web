import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_SECTION_MODULE_REGISTRY,
  selectDocumentModule,
  buildDocumentSectionModulePrompt,
  type DocumentSectionModuleId,
} from '@/services/ai/templates/documentSectionModules';

describe('DOCUMENT_SECTION_MODULE_REGISTRY', () => {
  const allIds: DocumentSectionModuleId[] = [
    'cover',
    'executive-summary',
    'key-findings',
    'recommendation',
    'evidence-table',
    'comparison-matrix',
    'timeline',
    'process',
    'risk-section',
    'decision-log',
    'appendix',
    'callout',
    'pull-quote',
  ];

  it('contains all expected module IDs', () => {
    for (const id of allIds) {
      expect(DOCUMENT_SECTION_MODULE_REGISTRY[id]).toBeDefined();
    }
  });

  it('every module has at least one required slot', () => {
    for (const id of allIds) {
      const module = DOCUMENT_SECTION_MODULE_REGISTRY[id];
      const hasRequired = module.slots.some((slot) => slot.required);
      expect(hasRequired, `${id} has no required slots`).toBe(true);
    }
  });

  it('every module has at least one matchKeyword', () => {
    for (const id of allIds) {
      const module = DOCUMENT_SECTION_MODULE_REGISTRY[id];
      expect(module.matchKeywords.length, `${id} has no match keywords`).toBeGreaterThan(0);
    }
  });

  it('every module has a non-empty promptGuidance', () => {
    for (const id of allIds) {
      const module = DOCUMENT_SECTION_MODULE_REGISTRY[id];
      expect(module.promptGuidance.trim().length, `${id} has empty promptGuidance`).toBeGreaterThan(0);
    }
  });

  it('evidence-table allows tables, cover does not', () => {
    expect(DOCUMENT_SECTION_MODULE_REGISTRY['evidence-table'].allowsTables).toBe(true);
    expect(DOCUMENT_SECTION_MODULE_REGISTRY['cover'].allowsTables).toBe(false);
  });

  it('pull-quote has headingLevel none', () => {
    expect(DOCUMENT_SECTION_MODULE_REGISTRY['pull-quote'].headingLevel).toBe('none');
  });
});

describe('selectDocumentModule', () => {
  it('matches "Executive Summary" to executive-summary', () => {
    expect(selectDocumentModule('Executive Summary').id).toBe('executive-summary');
  });

  it('matches "Key Findings" to key-findings', () => {
    expect(selectDocumentModule('Key Findings').id).toBe('key-findings');
  });

  it('matches "Timeline" to timeline', () => {
    expect(selectDocumentModule('Timeline').id).toBe('timeline');
  });

  it('matches "Comparison Matrix" to comparison-matrix', () => {
    expect(selectDocumentModule('Comparison Matrix').id).toBe('comparison-matrix');
  });

  it('matches "Risk Register" to risk-section', () => {
    expect(selectDocumentModule('Risk Register').id).toBe('risk-section');
  });

  it('matches "Recommendation" to recommendation', () => {
    expect(selectDocumentModule('Recommendation').id).toBe('recommendation');
  });

  it('matches "Evidence Table" to evidence-table', () => {
    expect(selectDocumentModule('Evidence Table').id).toBe('evidence-table');
  });

  it('matches "Process Steps" to process', () => {
    expect(selectDocumentModule('Process Steps').id).toBe('process');
  });

  it('matches "Appendix" to appendix', () => {
    expect(selectDocumentModule('Appendix').id).toBe('appendix');
  });

  it('matches "Pull Quote" to pull-quote', () => {
    expect(selectDocumentModule('Pull Quote').id).toBe('pull-quote');
  });

  it('matches "Important Note" to callout', () => {
    expect(selectDocumentModule('Important Note').id).toBe('callout');
  });

  it('falls back to executive-summary for unknown titles', () => {
    const result = selectDocumentModule('xyzzy-nonexistent-module-abc');
    expect(result.id).toBe('executive-summary');
  });

  it('is case-insensitive', () => {
    expect(selectDocumentModule('TIMELINE').id).toBe('timeline');
    expect(selectDocumentModule('key findings').id).toBe('key-findings');
  });

  it('matches document blueprint module class names used by the runtime', () => {
    expect(selectDocumentModule('doc-kpi-grid').id).toBe('key-findings');
    expect(selectDocumentModule('doc-meta-grid').id).toBe('evidence-table');
    expect(selectDocumentModule('doc-callout').id).toBe('callout');
    expect(selectDocumentModule('doc-pullquote').id).toBe('pull-quote');
    expect(selectDocumentModule('doc-progress').id).toBe('process');
  });

  it('uses runtime role hints when the title is generic', () => {
    expect(selectDocumentModule('Module 2', { role: 'timeline' }).id).toBe('timeline');
    expect(selectDocumentModule('Module 3', { role: 'kpi-proof' }).id).toBe('key-findings');
  });
});

describe('buildDocumentSectionModulePrompt', () => {
  it('includes the module label in the output', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['recommendation'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain('RECOMMENDATION');
  });

  it('includes the module purpose', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['timeline'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain(module.purpose);
  });

  it('lists all slot IDs', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['key-findings'];
    const prompt = buildDocumentSectionModulePrompt(module);
    for (const slot of module.slots) {
      expect(prompt).toContain(slot.id);
    }
  });

  it('marks required vs optional slots', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['recommendation'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain('required');
    expect(prompt).toContain('optional');
  });

  it('includes promptGuidance', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['evidence-table'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain(module.promptGuidance);
  });

  it('includes accessibility expectations', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['evidence-table'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain('Accessibility:');
    expect(prompt).toContain('table must have a <thead>');
  });

  it('includes heading level constraint', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['cover'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain('<h1>');
  });

  it('handles headingLevel none for pull-quote', () => {
    const module = DOCUMENT_SECTION_MODULE_REGISTRY['pull-quote'];
    const prompt = buildDocumentSectionModulePrompt(module);
    expect(prompt).toContain('none');
    expect(prompt).not.toContain('<none');
  });
});
