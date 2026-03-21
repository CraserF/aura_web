/**
 * Input validation — single source of truth for request classification.
 * Consolidates patterns previously duplicated in agentWorkflow.ts and planner.ts.
 */

export type RequestIntent =
  | 'create'
  | 'modify'
  | 'refine_style'
  | 'add_slides'
  | 'off_topic'
  | 'blocked';

/** Patterns that indicate harmful or inappropriate content */
export const BLOCKED_PATTERNS = [
  /\b(hack|exploit|malware|phishing|ddos)\b/i,
  /\b(how\s+to\s+(?:steal|crack|break\s+into|bypass\s+security))\b/i,
  /\b(illegal\s+(?:drugs?|weapons?|activities?))\b/i,
  /\b(hate\s+speech|discriminat(?:e|ion)|supremac(?:y|ist))\b/i,
];

/** Topics that are clearly not presentation-related */
export const OFF_TOPIC_PATTERNS = [
  /^(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|would|should)\b(?!.*(?:slide|presentation|deck|present))/i,
  /^(tell me|explain)\s+(?!.*(?:slide|presentation|deck))/i,
  /^(write|compose)\s+(an?\s+)?(email|letter|essay|poem|story|song)\b/i,
  /^(solve|calculate|compute|what\s+is\s+\d)/i,
];

/** Classify user intent based on prompt content */
export function classifyIntent(
  prompt: string,
  hasExistingSlides: boolean,
): { intent: RequestIntent; reason?: string } {
  const trimmed = prompt.trim();

  if (!trimmed) {
    return { intent: 'blocked', reason: 'Please enter a prompt describing what you want to create.' };
  }

  for (const p of BLOCKED_PATTERNS) {
    if (p.test(trimmed)) {
      return { intent: 'blocked', reason: 'This request contains content that cannot be used for presentations.' };
    }
  }

  if (!hasExistingSlides) {
    for (const p of OFF_TOPIC_PATTERNS) {
      if (p.test(trimmed)) {
        return {
          intent: 'off_topic',
          reason: 'This looks like a general question rather than a presentation request. Try: "Create a 10-slide pitch deck about renewable energy"',
        };
      }
    }
  }

  if (hasExistingSlides) {
    if (/\b(style|theme|color|font|background|design|look)\b/i.test(trimmed)) return { intent: 'refine_style' };
    if (/\b(add|append|insert|include|new\s+slide)\b/i.test(trimmed)) return { intent: 'add_slides' };
    return { intent: 'modify' };
  }

  return { intent: 'create' };
}
