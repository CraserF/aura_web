/**
 * cleanMessage — strip API edge cases that cause hard errors.
 *
 * Case 1: Orphaned reasoning parts (Anthropic thinking mode)
 *   An AssistantModelMessage with only a 'reasoning' part and no following 'text' or 'tool-call'
 *   part causes errors when thinking mode is enabled. Strip the orphan.
 *
 * Case 3: Tool-call input that is an empty string instead of an object
 *   Some LLM providers (e.g. LiteLLM) return "" instead of {} for empty tool inputs.
 *   Normalize to {}.
 */
import type { ModelMessage } from 'ai';

export function cleanMessages(messages: ModelMessage[]): ModelMessage[] {
  return messages
    .map(cleanMessage)
    .filter((m): m is ModelMessage => m !== null);
}

function cleanMessage(message: ModelMessage): ModelMessage | null {
  if (message.role !== 'assistant') return message;

  const content = message.content;
  if (!Array.isArray(content)) return message;

  // Case 3: normalize empty-string tool-call inputs to {}
  const fixed = content.map((part) => {
    if (part.type === 'tool-call' && (part.input === '' || part.input === null)) {
      return { ...part, input: {} };
    }
    return part;
  });

  // Case 1: drop orphaned reasoning parts
  // A reasoning part is orphaned if it is the LAST part (no text/tool-call follows it)
  const lastPart = fixed[fixed.length - 1];
  if (fixed.length > 0 && lastPart?.type === 'reasoning') {
    // Only keep non-reasoning parts, or if all are reasoning, drop the message
    const withoutTrailingReasoning = fixed.filter((p, i) => {
      if (p.type !== 'reasoning') return true;
      // Keep reasoning parts that are followed by a non-reasoning part
      return fixed.slice(i + 1).some((next) => next.type !== 'reasoning');
    });
    if (withoutTrailingReasoning.length === 0) return null;
    return { ...message, content: withoutTrailingReasoning };
  }

  return { ...message, content: fixed };
}
