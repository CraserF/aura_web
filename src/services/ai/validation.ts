/**
 * Input validation — single source of truth for request classification.
 * Consolidates patterns previously duplicated in agentWorkflow.ts and planner.ts.
 */

export type RequestIntent =
  | 'create'
  | 'modify'
  | 'refine_style'
  | 'add_slides'
  | 'batch_create'   // explicit multi-slide queue with distinct content per slide
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

  // Batch create detection: explicit multi-slide request with content breakdown
  if (!hasExistingSlides) {
    const isBatch = detectBatchIntent(trimmed);
    if (isBatch) return { intent: 'batch_create' };
  }

  if (hasExistingSlides) {
    if (/\b(style|theme|color|font|background|design|look)\b/i.test(trimmed)) return { intent: 'refine_style' };
    if (/\b(add|append|insert|include|new\s+slide)\b/i.test(trimmed)) return { intent: 'add_slides' };
    return { intent: 'modify' };
  }

  return { intent: 'create' };
}

/**
 * Detect whether a prompt is an explicit multi-slide batch request with
 * distinct content per slide. Conservative — only fires when the user
 * clearly specifies multiple slides with a content breakdown.
 */
function detectBatchIntent(prompt: string): boolean {
  const lower = prompt.toLowerCase();

  // "create X slides: ..." or "make X slides: ..."
  if (/\b(?:create|make|generate|build)\s+(\d+|a\s+(?:few|couple of)|several|multiple)\s+slides?\b/i.test(prompt)) {
    // Must also have content breakdown (numbered list, colon-separated topics, or "first slide... second slide...")
    const hasContentBreakdown =
      /:\s*[\w\s,]+(?:,\s*[\w\s]+){1,}/.test(prompt) || // "slides: intro, problem, solution"
      /\b(first|1st|second|2nd|third|3rd)\s+slide\b/i.test(lower) || // "first slide..., second slide..."
      /\d+\.\s+\w/.test(prompt); // numbered list "1. Intro 2. Problem"
    if (hasContentBreakdown) return true;
  }

  // "a deck" or "a presentation" with explicit slide count AND content list
  if (/\b(deck|presentation)\b/i.test(lower)) {
    const hasSlideCount =
      /\b(\d+)[-\s]slide\b/i.test(lower) || /\b(\d+)\s+slides?\b/i.test(lower);
    const hasContentList = /:\s*[\w\s]+(?:,\s*[\w\s]+){2,}/.test(prompt); // "deck: intro, problem, solution, pricing"
    if (hasSlideCount && hasContentList) return true;
    // also "4-slide pitch deck: intro, problem..." pattern
    if (hasSlideCount && /:\s*\w/.test(prompt)) return true;
  }

  return false;
}
