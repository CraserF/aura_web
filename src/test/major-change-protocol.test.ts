import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_MAJOR_CHANGE_CASES,
  MAJOR_CHANGE_CASES,
  PRESENTATION_MAJOR_CHANGE_CASES,
  REQUIRED_DOCUMENT_CASE_CATEGORIES,
  REQUIRED_PRESENTATION_CASE_CATEGORIES,
  REQUIRED_SPREADSHEET_CASE_CATEGORIES,
  SPREADSHEET_MAJOR_CHANGE_CASES,
} from '@/test/fixtures/major-change-cases';

describe('major workflow change validation protocol fixtures', () => {
  it('uses unique case ids with prompts, expected outcomes, and checks', () => {
    const ids = new Set<string>();

    for (const testCase of MAJOR_CHANGE_CASES) {
      expect(testCase.id.trim().length).toBeGreaterThan(0);
      expect(ids.has(testCase.id)).toBe(false);
      ids.add(testCase.id);

      expect(testCase.prompt.trim().length).toBeGreaterThan(0);
      expect(testCase.startingState.trim().length).toBeGreaterThan(0);
      expect(testCase.expectedOutcome.trim().length).toBeGreaterThan(0);
      expect(testCase.checks.length).toBeGreaterThan(0);
      expect(testCase.checks.every((check) => check.trim().length > 0)).toBe(true);
    }
  });

  it('keeps a broad document regression matrix instead of a smoke-test-only list', () => {
    expect(DOCUMENT_MAJOR_CHANGE_CASES.length).toBeGreaterThanOrEqual(18);

    const categories = new Set(DOCUMENT_MAJOR_CHANGE_CASES.map((testCase) => testCase.category));
    for (const category of REQUIRED_DOCUMENT_CASE_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it('keeps a broad presentation regression matrix instead of a smoke-test-only list', () => {
    expect(PRESENTATION_MAJOR_CHANGE_CASES.length).toBeGreaterThanOrEqual(16);

    const categories = new Set(PRESENTATION_MAJOR_CHANGE_CASES.map((testCase) => testCase.category));
    for (const category of REQUIRED_PRESENTATION_CASE_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it('covers spreadsheet-equivalent edit families rather than forcing document categories onto sheets', () => {
    expect(SPREADSHEET_MAJOR_CHANGE_CASES.length).toBeGreaterThanOrEqual(14);

    const categories = new Set(SPREADSHEET_MAJOR_CHANGE_CASES.map((testCase) => testCase.category));
    for (const category of REQUIRED_SPREADSHEET_CASE_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });
});
