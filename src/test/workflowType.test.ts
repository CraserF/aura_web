import { describe, it, expect } from 'vitest';
import { detectWorkflowType } from '@/lib/workflowType';

describe('detectWorkflowType', () => {
  it('detects presentation from "slide" keyword', () => {
    expect(detectWorkflowType('create a slide deck for my talk', undefined)).toBe('presentation');
  });

  it('detects presentation from "presentation" keyword', () => {
    expect(detectWorkflowType('make a presentation about marketing', undefined)).toBe('presentation');
  });

  it('detects presentation from "deck" keyword', () => {
    expect(detectWorkflowType('build a pitch deck', undefined)).toBe('presentation');
  });

  it('detects presentation from "keynote" keyword', () => {
    expect(detectWorkflowType('create a keynote for the event', undefined)).toBe('presentation');
  });

  it('detects document from "document" keyword', () => {
    expect(detectWorkflowType('write a document about our strategy', undefined)).toBe('document');
  });

  it('detects document from "report" keyword', () => {
    expect(detectWorkflowType('generate a quarterly report', undefined)).toBe('document');
  });

  it('detects document from "wiki" keyword', () => {
    expect(detectWorkflowType('create a wiki page for the API', undefined)).toBe('document');
  });

  it('detects document from "readme" keyword', () => {
    expect(detectWorkflowType('write a readme for the project', undefined)).toBe('document');
  });

  it('presentation keywords take priority over active doc type', () => {
    expect(detectWorkflowType('add slides to my deck', 'document')).toBe('presentation');
  });

  it('document keywords take priority over active doc type', () => {
    expect(detectWorkflowType('update the report', 'presentation')).toBe('document');
  });

  it('falls back to activeDocType when no keywords match', () => {
    expect(detectWorkflowType('make it better', 'document')).toBe('document');
    expect(detectWorkflowType('make it better', 'presentation')).toBe('presentation');
  });

  it('defaults to presentation when no keywords and no active doc', () => {
    expect(detectWorkflowType('make it more colorful', undefined)).toBe('presentation');
  });

  it('is case-insensitive', () => {
    expect(detectWorkflowType('Create a SLIDE deck', undefined)).toBe('presentation');
    expect(detectWorkflowType('Write a REPORT', undefined)).toBe('document');
  });
});
