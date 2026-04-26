import {
  toProductionPresentationTemplate,
  type TemplateId,
} from './registry';

interface SelectionPattern {
  templateId: TemplateId;
  patterns: RegExp[];
  weight: number;
}

const SELECTION_PATTERNS: SelectionPattern[] = [
  {
    templateId: 'executive-briefing-light',
    patterns: [/\b(executive briefing|leadership review|board narrative|board deck|decision summary|executive deck)\b/i],
    weight: 13,
  },
  {
    templateId: 'launch-narrative-light',
    patterns: [/\b(launch plan|launch narrative|go-to-market|gtm|launch deck|kickoff deck|market launch)\b/i],
    weight: 13,
  },
  {
    templateId: 'stage-setting-light',
    patterns: [/\b(setting(?: |-)?the(?: |-)?stage|why it matters|context slide|background slide|problem framing|scene setting)\b/i],
    weight: 11,
  },
  {
    templateId: 'finance-grid-light',
    patterns: [/\b(finance|financial|mechanism|capital stack|allocation|scorecard|blended|funding structure|investment model)\b/i],
    weight: 11,
  },
  {
    templateId: 'editorial-light',
    patterns: [/\b(executive brief|board|leadership update|editorial|explainer|premium business|business narrative)\b/i],
    weight: 10,
  },
  {
    templateId: 'editorial-magazine',
    patterns: [/\b(editorial|magazine|long.?form|thought\s*leader|serif|article|essay|literary)\b/i],
    weight: 9,
  },
  {
    templateId: 'infographic-grid',
    patterns: [/\b(infographic|data\s*viz|visuali[sz]ation|statistic|chart\s*grid|research\s*finding)\b/i],
    weight: 9,
  },
  {
    templateId: 'interactive-quiz',
    patterns: [/\b(quiz|trivia|question|knowledge\s*check|game\s*show|kahoot|test\s*your|multiple.?choice)\b/i],
    weight: 10,
  },
  {
    templateId: 'split-world',
    patterns: [/\b(split|dual|two\s*world|before.?after|left.?right|versus|dichotomy)\b/i],
    weight: 8,
  },
  {
    templateId: 'landscape-illustration',
    patterns: [/\b(landscape|illustrat|scene|nature|environment|immersive|journey|scenic)\b/i],
    weight: 8,
  },
  {
    templateId: 'multi-panel-dashboard',
    patterns: [/\b(multi.?panel|panel\s*dashboard|category\s*board|status\s*board|admin\s*panel|overview\s*panel)\b/i],
    weight: 9,
  },
  {
    templateId: 'sidebar-cards',
    patterns: [/\b(sidebar|side.?bar|luxury\s*brand|premium\s*brand|agency|service\s*showcase)\b/i],
    weight: 8,
  },
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
    patterns: [/\b(compare|comparison|comparative|vs\.?|versus|pros?\s*(and|&)\s*cons?|evaluat|benchmark)\b/i],
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

  let bestMatch: TemplateId = 'editorial-light';
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

  return toProductionPresentationTemplate(bestMatch);
}
