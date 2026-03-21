// ============================================
// Template Blueprints — Condensed high-quality
// reference slides injected into the system prompt
// by the agent workflow based on detected style.
// ============================================

export type TemplateStyle =
  | 'keynote'
  | 'corporate'
  | 'tech'
  | 'creative'
  | 'minimal'
  | 'pitch'
  | 'editorial'
  | 'scifi'
  | 'data'
  | 'educational';

export interface TemplatePalette {
  bg: string;
  surface: string;
  border: string;
  heading: string;
  body: string;
  muted: string;
  primary: string;
  accent: string;
  fontImport: string;
  headingFont: string;
  bodyFont: string;
}

export interface TemplateBlueprint {
  style: TemplateStyle;
  description: string;
  palette: TemplatePalette;
  animationLevel: 1 | 2 | 3 | 4;
  exampleSlides: string;
}

// ============================================
// Palettes
// ============================================

const PALETTES: Record<TemplateStyle, TemplatePalette> = {
  keynote: {
    bg: '#0a0a1a',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#ffffff',
    body: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#818cf8',
    accent: '#c084fc',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap',
    headingFont: "'Space Grotesk',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
  corporate: {
    bg: '#0f172a',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#f1f5f9',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#3b82f6',
    accent: '#8b5cf6',
    fontImport: 'family=Inter:wght@400;500;600;700;800&display=swap',
    headingFont: "'Inter',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
  tech: {
    bg: '#09090b',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    heading: '#fafafa',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#0ea5e9',
    accent: '#22d3ee',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap',
    headingFont: "'Space Grotesk',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
  creative: {
    bg: '#1a1025',
    surface: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#f5f0ff',
    body: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#a78bfa',
    accent: '#f472b6',
    fontImport: 'family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap',
    headingFont: "'Sora',sans-serif",
    bodyFont: "'DM Sans',sans-serif",
  },
  minimal: {
    bg: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    heading: '#0f172a',
    body: '#475569',
    muted: '#94a3b8',
    primary: '#2563eb',
    accent: '#7c3aed',
    fontImport: 'family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    headingFont: "'Plus Jakarta Sans',sans-serif",
    bodyFont: "'Plus Jakarta Sans',sans-serif",
  },
  pitch: {
    bg: '#0a0a1a',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#ffffff',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#6366f1',
    accent: '#f59e0b',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@300;400;600&display=swap',
    headingFont: "'Space Grotesk',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
  editorial: {
    bg: '#1c1917',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#fafaf9',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.45)',
    primary: '#f97316',
    accent: '#fbbf24',
    fontImport: 'family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@400;600&display=swap',
    headingFont: "'Playfair Display',serif",
    bodyFont: "'Source Serif 4',serif",
  },
  scifi: {
    bg: '#050510',
    surface: 'rgba(0,255,136,0.04)',
    border: 'rgba(0,255,136,0.12)',
    heading: '#e0ffe0',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.35)',
    primary: '#00ff88',
    accent: '#06b6d4',
    fontImport: 'family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600&display=swap',
    headingFont: "'Orbitron',sans-serif",
    bodyFont: "'Rajdhani',sans-serif",
  },
  data: {
    bg: '#0c1222',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    heading: '#e0f2fe',
    body: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#0ea5e9',
    accent: '#10b981',
    fontImport: 'family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400&display=swap',
    headingFont: "'Inter',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
  educational: {
    bg: '#1e1b4b',
    surface: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    heading: '#e0e7ff',
    body: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.4)',
    primary: '#8b5cf6',
    accent: '#ec4899',
    fontImport: 'family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500&display=swap',
    headingFont: "'Plus Jakarta Sans',sans-serif",
    bodyFont: "'Inter',sans-serif",
  },
};

// ============================================
// Example slides per template style
// These are injected into the system prompt as "this is what great looks like"
// ============================================

function buildExampleSlides(p: TemplatePalette): string {
  return `
<!-- TITLE SLIDE — hero with gradient text and scene background -->
<section data-background-color="${p.bg}" data-transition="fade" style="--primary:${p.primary}; --accent:${p.accent}; --bg-dark:${p.bg}; --heading-font:${p.headingFont}; --body-font:${p.bodyFont};">
  <div class="scene-particles" style="position:absolute; inset:0; z-index:0; pointer-events:none;">
    <div class="particle"></div><div class="particle"></div><div class="particle"></div>
    <div class="particle"></div><div class="particle"></div><div class="particle"></div>
  </div>
  <div style="position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:2rem;">
    <h1 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:3.5em; font-weight:700; letter-spacing:-0.03em; line-height:1.1; background:linear-gradient(135deg,${p.heading},${p.primary}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; margin:0;">
      Presentation Title
    </h1>
    <div class="anim-fade-in-up delay-200" style="width:60px; height:4px; background:linear-gradient(90deg,var(--primary),var(--accent)); border-radius:2px; margin:1.2rem auto;"></div>
    <p class="anim-fade-in-up delay-300" style="font-family:var(--body-font); font-size:1.3em; color:${p.body}; margin:0; max-width:600px;">
      A compelling subtitle that sets the tone
    </p>
  </div>
</section>

<!-- CONTENT SLIDE — bento grid with glassmorphism cards -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 0.3em; letter-spacing:-0.02em;">Key Features</h2>
    <div class="anim-fade-in-up delay-100" style="width:50px; height:3px; background:var(--primary); border-radius:2px; margin-bottom:1.5rem;"></div>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;">
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:1.8rem; backdrop-filter:blur(12px);">
        <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,${p.primary}20,${p.accent}20); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.1em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Lightning Fast</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Optimized for speed with sub-millisecond response times across the board.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:1.8rem; backdrop-filter:blur(12px);">
        <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,${p.primary}20,${p.accent}20); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.1em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Secure by Default</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Enterprise-grade security with zero-trust architecture built in.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:1.8rem; backdrop-filter:blur(12px);">
        <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,${p.primary}20,${p.accent}20); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.1em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Real-Time Analytics</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Live dashboards with instant insights and automatic alerting.</p>
      </div>
    </div>
  </div>
</section>

<!-- METRICS SLIDE — large numbers with context -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 1.5rem; letter-spacing:-0.02em; text-align:center;">By the Numbers</h2>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;">
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:2rem 1rem;">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:700; color:var(--primary); line-height:1;">$4.2M</div>
        <div style="font-family:var(--body-font); font-size:0.75em; color:${p.muted}; margin-top:0.5em;">Annual Revenue</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 24% YoY</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:2rem 1rem;">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:700; color:var(--primary); line-height:1;">125K</div>
        <div style="font-family:var(--body-font); font-size:0.75em; color:${p.muted}; margin-top:0.5em;">Active Users</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 18% MoM</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:2rem 1rem;">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:700; color:var(--primary); line-height:1;">99.9%</div>
        <div style="font-family:var(--body-font); font-size:0.75em; color:${p.muted}; margin-top:0.5em;">Uptime SLA</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">42 days streak</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:16px; padding:2rem 1rem;">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:700; color:var(--primary); line-height:1;">72</div>
        <div style="font-family:var(--body-font); font-size:0.75em; color:${p.muted}; margin-top:0.5em;">NPS Score</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 8 points</div>
      </div>
    </div>
  </div>
</section>`.trim();
}

// ============================================
// Blueprint construction
// ============================================

export function getTemplateBlueprint(style: TemplateStyle): TemplateBlueprint {
  const palette = PALETTES[style];
  return {
    style,
    description: STYLE_DESCRIPTIONS[style],
    palette,
    animationLevel: STYLE_ANIM_LEVELS[style],
    exampleSlides: buildExampleSlides(palette),
  };
}

export function getPalette(style: TemplateStyle): TemplatePalette {
  return PALETTES[style];
}

const STYLE_DESCRIPTIONS: Record<TemplateStyle, string> = {
  keynote: 'High-impact keynote for product launches and conferences. Cinematic scene backgrounds, gradient text, bold typography.',
  corporate: 'Clean professional presentation for board meetings and business updates. Subtle animations, structured layouts, metrics focus.',
  tech: 'Modern tech presentation for architecture reviews and engineering talks. Dark theme, code-friendly, diagram layouts.',
  creative: 'Vibrant creative showcase for portfolios and design presentations. Expressive colors, bold typography, artistic layouts.',
  minimal: 'Ultra-clean minimal design for quick updates and simple briefs. Light theme, maximum readability, no distractions.',
  pitch: 'Investor pitch deck with compelling metrics and clear narrative. Strong hierarchy, metric cards, progress indicators.',
  editorial: 'Elegant storytelling format for case studies and narratives. Serif typography, warm palette, immersive reading experience.',
  scifi: 'Futuristic sci-fi theme for AI, cybersecurity, and space topics. Neon accents, matrix effects, monospace typography.',
  data: 'Data-driven dashboard for analytics reviews and KPI reports. Metric grids, progress bars, charts, clean data visualization.',
  educational: 'Teaching and training format for lectures and workshops. Clear hierarchy, progressive disclosure, interactive fragments.',
};

const STYLE_ANIM_LEVELS: Record<TemplateStyle, 1 | 2 | 3 | 4> = {
  keynote: 4,
  corporate: 2,
  tech: 3,
  creative: 3,
  minimal: 1,
  pitch: 2,
  editorial: 2,
  scifi: 4,
  data: 2,
  educational: 2,
};

// ============================================
// Style detection from user prompt
// ============================================

export function detectTemplateStyle(prompt: string): TemplateStyle {
  const lower = prompt.toLowerCase();

  if (/\b(keynote|launch|conference|announce|reveal)\b/.test(lower)) return 'keynote';
  if (/\b(pitch\s*deck|investor|startup|funding|series\s*[abc]|venture|fundrais|vc)\b/.test(lower)) return 'pitch';
  if (/\b(sci-?fi|futurist|cyber|neon|matrix|holo|space|galaxy)\b/.test(lower)) return 'scifi';
  if (/\b(creative|portfolio|design|art|brand|visual|showcase)\b/.test(lower)) return 'creative';
  if (/\b(minimal|clean|simple|whitespace|swiss|brief|quick)\b/.test(lower)) return 'minimal';
  if (/\b(story|editorial|narrative|journal|magazine|case\s*study)\b/.test(lower)) return 'editorial';
  if (/\b(data|analytics|dashboard|metrics|kpi|report|quarterly)\b/.test(lower)) return 'data';
  if (/\b(corporate|enterprise|business|executive|board|formal)\b/.test(lower)) return 'corporate';
  if (/\b(edu|teach|learn|train|workshop|lecture|course|class)\b/.test(lower)) return 'educational';
  if (/\b(tech|software|api|devops|cloud|ai|machine\s*learning|engineer|architect)\b/.test(lower)) return 'tech';

  return 'tech'; // default
}

export function detectAnimationLevel(prompt: string): 1 | 2 | 3 | 4 {
  const lower = prompt.toLowerCase();
  if (/\b(keynote|cinematic|spectacular|stunning|wow|immersive|showstopper|epic)\b/.test(lower)) return 4;
  if (/\b(creative|animated|dynamic|interactive|engaging|impressive|demo|showcase)\b/.test(lower)) return 3;
  if (/\b(simple|minimal|clean|professional|corporate|formal|conservative|subtle|plain)\b/.test(lower)) return 1;
  return 2;
}
