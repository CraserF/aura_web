/**
 * M4.8 — cleanMessage unit tests
 *
 * Tests the two defensive edge cases handled by cleanMessages():
 *   Case 1: Orphaned reasoning parts (Anthropic thinking mode)
 *   Case 3: Tool-call input normalised from empty string to {}
 */
import { describe, it, expect } from 'vitest';
import { cleanMessages } from '@/services/ai/cleanMessage';
import type { ModelMessage } from 'ai';

// ── Case 3: empty-string tool-call input normalisation ────────────────────────

describe('cleanMessages — Case 3: empty tool-call input', () => {
  it('normalises empty-string tool input to {}', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'tc1',
            toolName: 'validateSlideHtml',
            input: '' as unknown as Record<string, unknown>,
          },
        ],
      },
    ];

    const result = cleanMessages(messages);
    const part = result[0]?.role === 'assistant' && Array.isArray(result[0].content)
      ? result[0].content[0]
      : null;

    expect(part?.type).toBe('tool-call');
    if (part?.type === 'tool-call') {
      expect(part.input).toEqual({});
    }
  });

  it('normalises null tool input to {}', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'tc2',
            toolName: 'submitFinalSlide',
            input: null as unknown as Record<string, unknown>,
          },
        ],
      },
    ];

    const result = cleanMessages(messages);
    const part = result[0]?.role === 'assistant' && Array.isArray(result[0].content)
      ? result[0].content[0]
      : null;

    if (part?.type === 'tool-call') {
      expect(part.input).toEqual({});
    }
  });

  it('leaves valid tool input unchanged', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'tc3',
            toolName: 'submitFinalSlide',
            input: { html: '<section>hi</section>' },
          },
        ],
      },
    ];

    const result = cleanMessages(messages);
    const part = result[0]?.role === 'assistant' && Array.isArray(result[0].content)
      ? result[0].content[0]
      : null;

    if (part?.type === 'tool-call') {
      expect(part.input).toEqual({ html: '<section>hi</section>' });
    }
  });
});

// ── Case 1: orphaned trailing reasoning parts ─────────────────────────────────

describe('cleanMessages — Case 1: orphaned reasoning', () => {
  it('removes a message whose only content is a trailing reasoning part', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [{ type: 'reasoning', text: 'thinking...' }],
      },
    ];

    const result = cleanMessages(messages);
    expect(result).toHaveLength(0);
  });

  it('strips trailing reasoning part when followed by no output', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Some text first' },
          { type: 'reasoning', text: 'trailing reasoning' },
        ],
      },
    ];

    const result = cleanMessages(messages);
    const content = result[0]?.role === 'assistant' ? result[0].content : null;
    expect(Array.isArray(content) && content.some((p) => p.type === 'reasoning')).toBe(false);
    expect(Array.isArray(content) && content.some((p) => p.type === 'text')).toBe(true);
  });

  it('keeps reasoning parts that are followed by a text part', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'reasoning', text: 'let me think...' },
          { type: 'text', text: 'Here is my answer' },
        ],
      },
    ];

    const result = cleanMessages(messages);
    const content = result[0]?.role === 'assistant' ? result[0].content : null;
    expect(Array.isArray(content)).toBe(true);
    // reasoning is kept because text follows it
    expect(Array.isArray(content) && content.some((p) => p.type === 'reasoning')).toBe(true);
  });

  it('passes through non-assistant messages unchanged', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'system', content: 'You are a helpful assistant.' },
    ];

    const result = cleanMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]).toEqual(messages[1]);
  });
});
