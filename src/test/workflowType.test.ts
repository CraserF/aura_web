import { describe, it, expect } from 'vitest';
import { detectWorkflowType } from '@/lib/workflowType';

describe('detectWorkflowType', () => {
  it('detects presentation from "slide" keyword', () => {
    expect(detectWorkflowType('create a slide deck for my talk')).toBe('presentation');
  });

  it('detects presentation from "presentation" keyword', () => {
    expect(detectWorkflowType('make a presentation about marketing')).toBe('presentation');
  });

  it('detects presentation from "deck" keyword', () => {
    expect(detectWorkflowType('build a pitch deck')).toBe('presentation');
  });

  it('detects presentation from "keynote" keyword', () => {
    expect(detectWorkflowType('create a keynote for the event')).toBe('presentation');
  });

  it('detects document from "document" keyword', () => {
    expect(detectWorkflowType('write a document about our strategy')).toBe('document');
  });

  it('detects document from "report" keyword', () => {
    expect(detectWorkflowType('generate a quarterly report')).toBe('document');
  });

  it('detects document from "wiki" keyword', () => {
    expect(detectWorkflowType('create a wiki page for the API')).toBe('document');
  });

  it('detects document from "readme" keyword', () => {
    expect(detectWorkflowType('write a readme for the project')).toBe('document');
  });

  it('detects spreadsheet from "spreadsheet" keyword', () => {
    expect(detectWorkflowType('create a spreadsheet for revenue tracking')).toBe('spreadsheet');
  });

  it('detects spreadsheet from file-format keywords', () => {
    expect(detectWorkflowType('import this csv and summarize it')).toBe('spreadsheet');
    expect(detectWorkflowType('open xlsx and show top rows')).toBe('spreadsheet');
  });

  it('defaults to presentation when no keywords match', () => {
    expect(detectWorkflowType('make it more colorful')).toBe('presentation');
  });

  it('is case-insensitive', () => {
    expect(detectWorkflowType('Create a SLIDE deck')).toBe('presentation');
    expect(detectWorkflowType('Write a REPORT')).toBe('document');
  });
});
