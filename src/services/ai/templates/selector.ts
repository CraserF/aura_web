import type { TemplateId } from './registry';

interface SelectionPattern {
  templateId: TemplateId;
  patterns: RegExp[];
  weight: number;
}

const SELECTION_PATTERNS: SelectionPattern[] = [
  {
    templateId: 'keynote',
    patterns: [/\b(keynote|launch|conference|announce|reveal|main\s*stage)\b/i],
    weight: 10,
  },
  {
    templateId: 'pitch-deck',
    patterns: [/\b(pitch\s*deck|investor|startup|funding|series\s*[abc]|venture|fundrais|vc|seed\s*round)\b/i],
    weight: 10,
  },
  {
    templateId: 'sci-fi',
    patterns: [/\b(sci-?fi|futurist|cyber|neon|matrix|holo|space|galaxy|quantum)\b/i],
    weight: 10,
  },
  {
    templateId: 'creative-portfolio',
    patterns: [/\b(portfolio|creative|design\s*showcase|art\s*show|brand\s*book)\b/i],
    weight: 8,
  },
  {
    templateId: 'minimal',
    patterns: [/\b(minimal|clean|simple|whitespace|swiss|brief|quick\s*update)\b/i],
    weight: 8,
  },
  {
    templateId: 'storytelling',
    patterns: [/\b(story|editorial|narrative|journal|magazine|case\s*study)\b/i],
    weight: 8,
  },
  {
    templateId: 'data-dashboard',
    patterns: [/\b(data|analytics|dashboard|metrics|kpi|report)\b/i],
    weight: 7,
  },
  {
    templateId: 'corporate',
    patterns: [/\b(corporate|enterprise|business|executive|board|formal|quarterly)\b/i],
    weight: 7,
  },
  {
    templateId: 'educational',
    patterns: [/\b(edu|teach|learn|train|lecture|course|class|tutorial)\b/i],
    weight: 7,
  },
  {
    templateId: 'workshop',
    patterns: [/\b(workshop|hands-?on|exercise|interactive\s*session|bootcamp)\b/i],
    weight: 8,
  },
  {
    templateId: 'code-walkthrough',
    patterns: [/\b(code\s*walk|code\s*review|api\s*demo|developer\s*talk|live\s*coding)\b/i],
    weight: 9,
  },
  {
    templateId: 'product-demo',
    patterns: [/\b(product\s*demo|saas|feature\s*showcase|app\s*demo)\b/i],
    weight: 8,
  },
  {
    templateId: 'comparison',
    patterns: [/\b(compar|vs\.?|versus|pros?\s*(and|&)\s*cons?|evaluat|benchmark)\b/i],
    weight: 8,
  },
  {
    templateId: 'timeline',
    patterns: [/\b(timeline|roadmap|history|milestones|project\s*plan|phases)\b/i],
    weight: 8,
  },
  {
    templateId: 'cinematic',
    patterns: [/\b(cinematic|photogra|visual\s*story|art\s*direct|film)\b/i],
    weight: 9,
  },
  {
    templateId: 'tech-architecture',
    patterns: [/\b(architect|system\s*design|infra|devops|cloud|microservice|tech\s*stack)\b/i],
    weight: 7,
  },
];

/** Select the best template based on the user's prompt */
export function selectTemplate(
  prompt: string,
  context?: { audience?: string; purpose?: string },
): TemplateId {
  const fullText = [prompt, context?.audience, context?.purpose].filter(Boolean).join(' ');
  const lower = fullText.toLowerCase();

  let bestMatch: TemplateId = 'tech-architecture';
  let bestScore = 0;

  for (const { templateId, patterns, weight } of SELECTION_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = lower.match(pattern);
      if (matches) {
        score += weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = templateId;
    }
  }

  return bestMatch;
}
