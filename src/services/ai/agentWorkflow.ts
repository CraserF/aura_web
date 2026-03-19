import type { AIMessage } from './types';

// ============================================
// Agent Workflow for Presentation Setup
// ============================================
// Three-stage pipeline:
//   1. Validate & classify the user request
//   2. Enhance the prompt with structured guidance
//   3. Build the final AI messages with presentation context

/** Classification of user intent */
export type RequestIntent =
  | 'create'       // New presentation from scratch
  | 'modify'       // Change existing slides
  | 'refine_style' // Style/theme changes only
  | 'add_slides'   // Add slides to existing deck
  | 'off_topic'    // Not a presentation request
  | 'blocked';     // Harmful/inappropriate content

interface ValidationResult {
  intent: RequestIntent;
  reason?: string;
  enhancedPrompt?: string;
}

/** Patterns that indicate harmful, inappropriate, or off-topic content */
const BLOCKED_PATTERNS = [
  /\b(hack|exploit|malware|phishing|ddos)\b/i,
  /\b(how\s+to\s+(?:steal|crack|break\s+into|bypass\s+security))\b/i,
  /\b(illegal\s+(?:drugs?|weapons?|activities?))\b/i,
  /\b(hate\s+speech|discriminat(?:e|ion)|supremac(?:y|ist))\b/i,
];

/** Topics that are clearly not presentation-related */
const OFF_TOPIC_PATTERNS = [
  /^(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|would|should)\b(?!.*(?:slide|presentation|deck|present))/i,
  /^(tell me|explain)\s+(?!.*(?:slide|presentation|deck))/i,
  /^(write|compose)\s+(an?\s+)?(email|letter|essay|poem|story|song)\b/i,
  /^(solve|calculate|compute|what\s+is\s+\d)/i,
];

/**
 * Stage 1: Validate and classify the user's request.
 */
export function validateRequest(prompt: string, hasExistingSlides: boolean): ValidationResult {
  const trimmed = prompt.trim();

  // Check for empty input
  if (!trimmed) {
    return { intent: 'blocked', reason: 'Please enter a prompt describing what you want to create.' };
  }

  // Check for blocked content
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: 'blocked',
        reason: 'This request contains content that cannot be used for presentations. Please describe a professional presentation topic.',
      };
    }
  }

  // Check for off-topic requests (only if no existing slides — user might be asking about their slides)
  if (!hasExistingSlides) {
    for (const pattern of OFF_TOPIC_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          intent: 'off_topic',
          reason: 'This looks like a general question rather than a presentation request. Try describing the presentation you want to create — for example: "Create a 10-slide pitch deck about renewable energy"',
        };
      }
    }
  }

  // Classify intent
  if (hasExistingSlides) {
    if (/\b(style|theme|color|font|background|design|look)\b/i.test(trimmed)) {
      return { intent: 'refine_style' };
    }
    if (/\b(add|append|insert|include|new\s+slide)\b/i.test(trimmed)) {
      return { intent: 'add_slides' };
    }
    return { intent: 'modify' };
  }

  return { intent: 'create' };
}

/**
 * Stage 2: Enhance the user's prompt with structural guidance.
 * Adds presentation best-practice context based on the intent.
 */
export function enhancePrompt(prompt: string, intent: RequestIntent): string {
  switch (intent) {
    case 'create':
      return buildCreationGuidance(prompt);
    case 'modify':
      return buildModificationGuidance(prompt);
    case 'refine_style':
      return buildStyleGuidance(prompt);
    case 'add_slides':
      return buildAddSlidesGuidance(prompt);
    default:
      return prompt;
  }
}

function buildCreationGuidance(prompt: string): string {
  const hasSlideCount = /\d+\s*slide/i.test(prompt);
  const hasAudience = /\b(audience|for\s+(investors?|students?|team|executives?|clients?))\b/i.test(prompt);
  const hasTone = /\b(professional|casual|formal|fun|serious|minimal|creative)\b/i.test(prompt);

  const additions: string[] = [];

  if (!hasSlideCount) {
    additions.push('Create 8-12 slides with a clear narrative arc.');
  }
  if (!hasAudience) {
    additions.push('Target a professional audience.');
  }
  if (!hasTone) {
    additions.push('Use a clean, modern visual style with a dark color palette.');
  }

  additions.push(
    'Include a compelling title slide with a gradient background, logical section flow, and a strong closing slide.',
    'Use progressive reveal (fragment fade-up) for key points and list items.',
    'Use Unsplash images where relevant — at least 2-3 slides should include real photos.',
    'Use inline SVG icons for feature cards and key points.',
    'Use glassmorphism cards (semi-transparent backgrounds with border) for content grouping.',
    'Add decorative accent lines between title and subtitle elements.',
    'Ensure every element has explicit inline styles including color, font-size, font-weight, and font-family.',
    'NEVER use markdown syntax — only valid HTML tags.',
  );

  return `${prompt}\n\nPresentation guidelines:\n${additions.map((a) => `- ${a}`).join('\n')}`;
}

function buildModificationGuidance(prompt: string): string {
  return `${prompt}\n\nWhen modifying, maintain visual consistency with the existing deck's color scheme, typography, and transition style. Output all slides, not just changed ones.`;
}

function buildStyleGuidance(prompt: string): string {
  return `${prompt}\n\nApply style changes consistently across ALL slides. Maintain content and slide count, only change visual styling (colors, fonts, spacing, backgrounds, transitions).`;
}

function buildAddSlidesGuidance(prompt: string): string {
  return `${prompt}\n\nAdd the new slides in a logical position within the existing deck. Match the existing style, color scheme, and transition pattern. Output the complete deck with the new slides integrated.`;
}

/**
 * Stage 3: Build the complete message array for the AI,
 * incorporating the agent workflow.
 */
export function buildAgentMessages(
  userPrompt: string,
  existingSlidesHtml: string | undefined,
  chatHistory: AIMessage[],
  systemPrompt: string,
): { messages: AIMessage[]; blocked: boolean; blockReason?: string } {
  // Stage 1: Validate
  const validation = validateRequest(userPrompt, !!existingSlidesHtml);

  if (validation.intent === 'blocked' || validation.intent === 'off_topic') {
    return {
      messages: [],
      blocked: true,
      blockReason: validation.reason,
    };
  }

  // Stage 2: Enhance
  const enhanced = enhancePrompt(userPrompt, validation.intent);

  // Stage 3: Build messages
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Include recent chat history for context (limit to last 10 exchanges)
  const recentHistory = chatHistory.slice(-20);
  if (recentHistory.length > 0) {
    messages.push(...recentHistory);
  }

  if (existingSlidesHtml) {
    messages.push({
      role: 'user',
      content: `Here are the current slides:\n\n\`\`\`html\n${existingSlidesHtml}\n\`\`\`\n\nPlease modify them based on this request: ${enhanced}`,
    });
  } else {
    messages.push({
      role: 'user',
      content: enhanced,
    });
  }

  return { messages, blocked: false };
}
