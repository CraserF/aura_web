// ============================================
// Template Blueprints — Curated color themes
// inspired by Radix UI color system principles.
// Each theme has explicit usage guidance injected
// into the LLM system prompt.
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
  // Identity
  name: string;
  mode: 'light' | 'dark';

  // Background scale (Radix steps 1-2)
  bg: string;
  bgSubtle: string;

  // Surface scale (Radix steps 3-5)
  surface: string;
  surfaceHover: string;
  surfaceActive: string;

  // Border scale (Radix steps 6-7)
  border: string;
  borderStrong: string;

  // Solid / accent (Radix steps 8-9)
  primary: string;
  primaryHover: string;

  // Text scale (Radix steps 11-12)
  heading: string;
  body: string;
  muted: string;

  // Secondary accent
  accent: string;
  accentMuted: string;

  // Typography
  fontImport: string;
  headingFont: string;
  bodyFont: string;

  // Natural language color usage guide injected into the prompt
  colorUsageGuide: string;
}

export interface TemplateBlueprint {
  style: TemplateStyle;
  description: string;
  palette: TemplatePalette;
  animationLevel: 1 | 2 | 3 | 4;
  exampleSlides: string;
}

// ============================================
// 10 Curated Color Themes
// ============================================

const PALETTES: Record<TemplateStyle, TemplatePalette> = {
  // ── Midnight Executive (Keynote) ─────────────────────────
  keynote: {
    name: 'Midnight Executive',
    mode: 'dark',
    bg: '#1E2761',
    bgSubtle: '#1a2255',
    surface: 'rgba(202, 220, 252, 0.06)',
    surfaceHover: 'rgba(202, 220, 252, 0.10)',
    surfaceActive: 'rgba(202, 220, 252, 0.14)',
    border: 'rgba(202, 220, 252, 0.10)',
    borderStrong: 'rgba(202, 220, 252, 0.20)',
    primary: '#CADCFC',
    primaryHover: '#b8cef7',
    heading: '#FFFFFF',
    body: 'rgba(202, 220, 252, 0.80)',
    muted: 'rgba(202, 220, 252, 0.50)',
    accent: '#FFFFFF',
    accentMuted: 'rgba(255, 255, 255, 0.08)',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap',
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Midnight Executive:
- BACKGROUND (#1E2761): Deep authoritative navy for all slide backgrounds.
- SURFACE (ice blue at 6% opacity): Glass card fills. Barely-there ice blue tint over navy.
- BORDER (ice blue at 10%): Card edges and dividers. Subtle, never distracting.
- PRIMARY (#CADCFC ice blue): Icon containers, metric values, accent fills, CTA buttons. Your main highlight.
- HEADING (#FFFFFF): All h1/h2 text. Pure white for maximum contrast on navy.
- BODY (ice blue at 80%): Paragraph text, bullets. Slightly translucent for depth.
- MUTED (ice blue at 50%): Captions, labels, metadata. Low emphasis.
- Gradient: linear-gradient(135deg, #FFFFFF, #CADCFC) for hero title text ONLY.
- Cards: navy bg → ice blue glass surface → white heading → translucent body.
- NEVER use ice blue (#CADCFC) as a large background fill. It is an accent, not a surface.`,
  },

  // ── Ocean Gradient (Corporate) ───────────────────────────
  corporate: {
    name: 'Ocean Gradient',
    mode: 'dark',
    bg: '#065A82',
    bgSubtle: '#054d70',
    surface: 'rgba(28, 114, 147, 0.15)',
    surfaceHover: 'rgba(28, 114, 147, 0.22)',
    surfaceActive: 'rgba(28, 114, 147, 0.28)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.22)',
    primary: '#1C7293',
    primaryHover: '#1a8aaf',
    heading: '#FFFFFF',
    body: 'rgba(255, 255, 255, 0.82)',
    muted: 'rgba(255, 255, 255, 0.50)',
    accent: '#21295C',
    accentMuted: 'rgba(33, 41, 92, 0.25)',
    fontImport: 'family=Inter:wght@400;500;600;700;800&display=swap',
    headingFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Ocean Gradient:
- BACKGROUND (#065A82): Rich deep blue. Professional and authoritative.
- SURFACE (teal at 15%): Cards have a teal-tinted glass feel layered on deep blue.
- BORDER (white at 12%): Subtle white borders for structure.
- PRIMARY (#1C7293 teal): Icon backgrounds, metric numbers, accent buttons. Lighter teal for highlights.
- HEADING (#FFFFFF): White headings. Clean and high contrast on deep blue.
- BODY (white at 82%): Slightly translucent white body text.
- MUTED (white at 50%): Labels, captions.
- ACCENT (#21295C midnight): Use for dark badges, secondary card fills, or gradient end stops.
- Gradient: linear-gradient(135deg, #065A82, #1C7293) for section divider backgrounds.
- Cards: deep blue bg → teal glass surface → white heading → translucent body.
- AVOID using midnight accent (#21295C) as text on the blue background — too low contrast.`,
  },

  // ── Charcoal Minimal (Tech) ──────────────────────────────
  tech: {
    name: 'Charcoal Minimal',
    mode: 'light',
    bg: '#F2F2F2',
    bgSubtle: '#EAEAEA',
    surface: '#FFFFFF',
    surfaceHover: '#F8F8F8',
    surfaceActive: '#F0F0F0',
    border: '#E0E0E0',
    borderStrong: '#CCCCCC',
    primary: '#36454F',
    primaryHover: '#2d3a42',
    heading: '#212121',
    body: '#4A4A4A',
    muted: '#8A8A8A',
    accent: '#212121',
    accentMuted: 'rgba(33, 33, 33, 0.06)',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap',
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Charcoal Minimal (LIGHT MODE):
- BACKGROUND (#F2F2F2): Light warm gray. Clean, modern, Swiss-inspired.
- SURFACE (#FFFFFF): Pure white cards. Elevated with subtle box-shadow.
- BORDER (#E0E0E0): Light gray borders. Crisp and structured.
- PRIMARY (#36454F charcoal): Icon containers, accent fills, buttons. Dark charcoal for emphasis.
- HEADING (#212121): Near-black headings. Maximum readability on light backgrounds.
- BODY (#4A4A4A): Dark gray body text. High contrast, easy to read.
- MUTED (#8A8A8A): Mid-gray for captions, labels, metadata.
- Do NOT use gradient text on light backgrounds — use solid #212121 headings with charcoal accent dividers.
- Cards: white surface + 1px solid #E0E0E0 border + box-shadow: 0 1px 3px rgba(0,0,0,0.08).
- Depth via shadows, NOT transparency. No backdrop-filter:blur on light mode.
- Monochromatic palette — all depth comes from gray scale layering.`,
  },

  // ── Coral Energy (Creative) ──────────────────────────────
  creative: {
    name: 'Coral Energy',
    mode: 'light',
    bg: '#FFFBF0',
    bgSubtle: '#FFF5E0',
    surface: '#FFFFFF',
    surfaceHover: '#FFF8F0',
    surfaceActive: '#FFF0E5',
    border: '#F0E0D0',
    borderStrong: '#E8C8B8',
    primary: '#F96167',
    primaryHover: '#e8525a',
    heading: '#2F3C7E',
    body: '#4A4560',
    muted: '#8A8598',
    accent: '#F9E795',
    accentMuted: 'rgba(249, 231, 149, 0.20)',
    fontImport: 'family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap',
    headingFont: "'Sora', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    colorUsageGuide: `COLOR RULES — Coral Energy (LIGHT MODE):
- BACKGROUND (#FFFBF0): Warm cream/off-white. Feels energetic yet approachable.
- SURFACE (#FFFFFF): White cards. Clean and bright.
- BORDER (#F0E0D0): Warm-tinted border. Softer than pure gray.
- PRIMARY (#F96167 coral): Icon containers, CTA buttons, accent badges. Vibrant and eye-catching.
- HEADING (#2F3C7E navy): Dark navy headings. Bold contrast against cream background.
- BODY (#4A4560): Dark purple-gray body text. Warm and readable.
- MUTED (#8A8598): Light purple-gray for captions and metadata.
- ACCENT (#F9E795 gold): Secondary highlight. Use for tags, pill badges, section dividers, subtle fills.
- Do NOT use coral (#F96167) as large background fills — too intense. Reserve for small accents.
- Do NOT use gradient text. Use solid navy headings with coral accent dividers.
- Cards: white surface + warm border + box-shadow: 0 1px 3px rgba(249,97,103,0.06).
- The navy-coral-gold triad creates a playful, high-energy feel.`,
  },

  // ── Sage Calm (Minimal) ──────────────────────────────────
  minimal: {
    name: 'Sage Calm',
    mode: 'light',
    bg: '#F7FAF8',
    bgSubtle: '#EFF5F1',
    surface: '#FFFFFF',
    surfaceHover: '#F0F7F3',
    surfaceActive: '#E8F2EC',
    border: '#D4E4DA',
    borderStrong: '#B8D0C0',
    primary: '#84B59F',
    primaryHover: '#6fa58c',
    heading: '#2D4A3E',
    body: '#4A665A',
    muted: '#7E9A8E',
    accent: '#50808E',
    accentMuted: 'rgba(80, 128, 142, 0.08)',
    fontImport: 'family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    headingFont: "'Plus Jakarta Sans', sans-serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    colorUsageGuide: `COLOR RULES — Sage Calm (LIGHT MODE):
- BACKGROUND (#F7FAF8): Barely-green white. Serene, clean, natural.
- SURFACE (#FFFFFF): Pure white cards. Minimal shadows.
- BORDER (#D4E4DA): Muted sage green border. Soft and organic.
- PRIMARY (#84B59F sage): Icon fills, accent elements, dividers. Calming green.
- HEADING (#2D4A3E): Deep forest green headings. Grounded and readable.
- BODY (#4A665A): Medium green-gray body text.
- MUTED (#7E9A8E): Faded sage for captions.
- ACCENT (#50808E slate): Secondary highlight. Slightly blue-green. Use for secondary badges or data accents.
- Minimal design: generous whitespace, simple layouts, 50%+ of each slide should be empty.
- Cards: white surface + sage border + box-shadow: 0 1px 2px rgba(0,0,0,0.04). Ultra-subtle.
- Do NOT use gradient text. Solid forest green headings only.
- No scene backgrounds or particles. Clean and quiet.`,
  },

  // ── Cherry Bold (Pitch) ──────────────────────────────────
  pitch: {
    name: 'Cherry Bold',
    mode: 'dark',
    bg: '#1A0A10',
    bgSubtle: '#220E16',
    surface: 'rgba(153, 0, 17, 0.10)',
    surfaceHover: 'rgba(153, 0, 17, 0.16)',
    surfaceActive: 'rgba(153, 0, 17, 0.22)',
    border: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    primary: '#990011',
    primaryHover: '#b30014',
    heading: '#FCF6F5',
    body: 'rgba(252, 246, 245, 0.78)',
    muted: 'rgba(252, 246, 245, 0.45)',
    accent: '#2F3C7E',
    accentMuted: 'rgba(47, 60, 126, 0.20)',
    fontImport: 'family=Space+Grotesk:wght@400;600;700&family=Inter:wght@300;400;600&display=swap',
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Cherry Bold:
- BACKGROUND (#1A0A10): Ultra-dark cherry-black. Dramatic, high-stakes.
- SURFACE (cherry at 10%): Cards have a warm reddish glass tint. Subtle drama.
- BORDER (white at 10%): Faint white borders for structure.
- PRIMARY (#990011 cherry): Metric numbers, CTA buttons, accent fills. Bold and urgent.
- HEADING (#FCF6F5 off-white): Warm white headings. Soft contrast on dark.
- BODY (off-white at 78%): Warm translucent body text.
- MUTED (off-white at 45%): Low-emphasis labels.
- ACCENT (#2F3C7E navy): Use for secondary badges, gradient end stops, data chart colors.
- Gradient: linear-gradient(135deg, #FCF6F5, #990011) for hero text — dramatic red fade.
- Cherry is a POWER color. Use it for emphasis on metrics, CTAs, and key data points only.
- NEVER fill entire cards with cherry red. It is an accent, not a surface.
- The cherry + navy + off-white triad conveys confidence and urgency — perfect for pitch decks.`,
  },

  // ── Berry & Cream (Editorial) ────────────────────────────
  editorial: {
    name: 'Berry & Cream',
    mode: 'dark',
    bg: '#2A1520',
    bgSubtle: '#321A28',
    surface: 'rgba(162, 103, 105, 0.10)',
    surfaceHover: 'rgba(162, 103, 105, 0.16)',
    surfaceActive: 'rgba(162, 103, 105, 0.22)',
    border: 'rgba(236, 226, 208, 0.10)',
    borderStrong: 'rgba(236, 226, 208, 0.20)',
    primary: '#A26769',
    primaryHover: '#b87577',
    heading: '#ECE2D0',
    body: 'rgba(236, 226, 208, 0.78)',
    muted: 'rgba(236, 226, 208, 0.45)',
    accent: '#6D2E46',
    accentMuted: 'rgba(109, 46, 70, 0.20)',
    fontImport: 'family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@400;600&display=swap',
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Source Serif 4', serif",
    colorUsageGuide: `COLOR RULES — Berry & Cream:
- BACKGROUND (#2A1520): Deep warm berry-black. Rich, editorial, sophisticated.
- SURFACE (dusty rose at 10%): Cards have a warm rose-tinted glass effect.
- BORDER (cream at 10%): Warm subtle borders.
- PRIMARY (#A26769 dusty rose): Accent fills, icon containers, dividers. Warm and elegant.
- HEADING (#ECE2D0 cream): Warm cream headings. Refined serif typography feel.
- BODY (cream at 78%): Soft cream body text.
- MUTED (cream at 45%): Low-emphasis metadata.
- ACCENT (#6D2E46 berry): Deeper berry for section divider backgrounds, gradient end stops, pull quote borders.
- The serif typography (Playfair Display + Source Serif 4) gives editorial sophistication.
- Gradient: linear-gradient(135deg, #ECE2D0, #A26769) for hero text on dark slides.
- Warm, muted palette. AVOID harsh contrasts. Everything should feel like a luxury magazine spread.`,
  },

  // ── Teal Trust (Sci-Fi) ──────────────────────────────────
  scifi: {
    name: 'Teal Trust',
    mode: 'dark',
    bg: '#041C20',
    bgSubtle: '#061E24',
    surface: 'rgba(2, 128, 144, 0.08)',
    surfaceHover: 'rgba(2, 128, 144, 0.14)',
    surfaceActive: 'rgba(2, 128, 144, 0.20)',
    border: 'rgba(2, 195, 154, 0.12)',
    borderStrong: 'rgba(2, 195, 154, 0.25)',
    primary: '#028090',
    primaryHover: '#029aad',
    heading: '#E0FFFA',
    body: 'rgba(224, 255, 250, 0.75)',
    muted: 'rgba(224, 255, 250, 0.40)',
    accent: '#02C39A',
    accentMuted: 'rgba(2, 195, 154, 0.10)',
    fontImport: 'family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600&display=swap',
    headingFont: "'Orbitron', sans-serif",
    bodyFont: "'Rajdhani', sans-serif",
    colorUsageGuide: `COLOR RULES — Teal Trust:
- BACKGROUND (#041C20): Near-black teal. Deep, futuristic, digital.
- SURFACE (teal at 8%): Cards have a subtle electric teal glass effect.
- BORDER (mint at 12%): Slightly glowing mint-green borders. Futuristic feel.
- PRIMARY (#028090 teal): Icon fills, data values, accent buttons. Electric teal.
- HEADING (#E0FFFA): Mint-white headings. High contrast, slightly green-tinted.
- BODY (mint-white at 75%): Translucent body text.
- MUTED (mint-white at 40%): Faded labels.
- ACCENT (#02C39A mint): Secondary highlight. Brighter green-mint for CTAs, progress bars, live indicators.
- Gradient: linear-gradient(135deg, #E0FFFA, #028090) for hero text.
- Teal → seafoam → mint creates an analogous color harmony. All shades of blue-green.
- Supports neon glow effects: box-shadow: 0 0 20px rgba(2,195,154,0.15) on accent elements.
- Scene backgrounds (matrix, starfield) work well with this palette.`,
  },

  // ── Forest & Moss (Data) ─────────────────────────────────
  data: {
    name: 'Forest & Moss',
    mode: 'dark',
    bg: '#1A2E1A',
    bgSubtle: '#1E331E',
    surface: 'rgba(151, 188, 98, 0.06)',
    surfaceHover: 'rgba(151, 188, 98, 0.12)',
    surfaceActive: 'rgba(151, 188, 98, 0.18)',
    border: 'rgba(151, 188, 98, 0.12)',
    borderStrong: 'rgba(151, 188, 98, 0.24)',
    primary: '#97BC62',
    primaryHover: '#a8ca78',
    heading: '#F5F5F5',
    body: 'rgba(245, 245, 245, 0.78)',
    muted: 'rgba(245, 245, 245, 0.45)',
    accent: '#2C5F2D',
    accentMuted: 'rgba(44, 95, 45, 0.20)',
    fontImport: 'family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400&display=swap',
    headingFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Forest & Moss:
- BACKGROUND (#1A2E1A): Deep forest green. Natural, grounded, data-focused.
- SURFACE (moss at 6%): Cards have a subtle green-tinted glass.
- BORDER (moss at 12%): Faint green borders.
- PRIMARY (#97BC62 moss green): Metric values, progress bars, chart bars, icon fills. Fresh, growth-oriented.
- HEADING (#F5F5F5 cream): Near-white headings on dark forest green.
- BODY (cream at 78%): Translucent body text.
- MUTED (cream at 45%): Faded labels. Use for axis labels, table headers.
- ACCENT (#2C5F2D forest): Deeper green for section dividers, gradient backgrounds, secondary fills.
- Data visualizations: use moss (#97BC62) for positive/primary metrics, cream for neutral labels.
- For negative metrics or warnings, use a muted amber: #D4A843.
- Gradient: linear-gradient(135deg, #F5F5F5, #97BC62) for hero text.
- The forest-to-moss gradient naturally suggests growth — ideal for data/analytics themes.`,
  },

  // ── Warm Terracotta (Educational) ────────────────────────
  educational: {
    name: 'Warm Terracotta',
    mode: 'light',
    bg: '#F5F0EB',
    bgSubtle: '#EDE5DC',
    surface: '#FFFFFF',
    surfaceHover: '#FBF6F1',
    surfaceActive: '#F5EDE4',
    border: '#E0D5C8',
    borderStrong: '#C8B8A8',
    primary: '#B85042',
    primaryHover: '#a64538',
    heading: '#3D2C2C',
    body: '#5A4545',
    muted: '#8A7575',
    accent: '#A7BEAE',
    accentMuted: 'rgba(167, 190, 174, 0.15)',
    fontImport: 'family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500&display=swap',
    headingFont: "'Plus Jakarta Sans', sans-serif",
    bodyFont: "'Inter', sans-serif",
    colorUsageGuide: `COLOR RULES — Warm Terracotta (LIGHT MODE):
- BACKGROUND (#F5F0EB): Warm sand/linen. Approachable, educational, calm.
- SURFACE (#FFFFFF): White cards. Clean and focused.
- BORDER (#E0D5C8): Warm beige borders. Soft and inviting.
- PRIMARY (#B85042 terracotta): Icon containers, accent dividers, CTA buttons. Warm earth tone.
- HEADING (#3D2C2C): Dark warm brown headings. Friendly and readable.
- BODY (#5A4545): Warm brown-gray body text.
- MUTED (#8A7575): Faded warm gray for captions and metadata.
- ACCENT (#A7BEAE sage green): Secondary highlight. Use for tags, progress indicators, secondary cards.
- Terracotta + sage is a warm-cool complementary pair. Use terracotta for action/emphasis, sage for supporting info.
- Do NOT use gradient text. Solid dark brown headings with terracotta accent dividers.
- Cards: white + warm border + box-shadow: 0 1px 3px rgba(0,0,0,0.06).
- Educational feel: clear hierarchy, generous spacing, focused content areas.`,
  },
};

// ============================================
// Example slides per template style
// Mode-aware: dark uses glassmorphism, light uses shadows
// ============================================

function buildDarkExampleSlides(p: TemplatePalette): string {
  return `
<!-- TITLE SLIDE — hero with gradient text -->
<section data-background-color="${p.bg}" data-transition="fade" style="--primary:${p.primary}; --accent:${p.accent}; --bg-dark:${p.bg}; --heading-font:${p.headingFont}; --body-font:${p.bodyFont};">
  <div style="position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:2rem;">
    <div style="display:inline-flex; padding:0.25em 0.75em; border-radius:999px; font-size:0.7em; font-weight:600; letter-spacing:0.03em; background:rgba(${hexToRgb(p.primary)},0.10); color:${p.primary}; border:1px solid rgba(${hexToRgb(p.primary)},0.20); margin-bottom:1.5rem;" class="anim-fade-in-up">
      PRESENTATION
    </div>
    <h1 class="anim-fade-in-up delay-100" style="font-family:var(--heading-font); font-size:3.5em; font-weight:700; letter-spacing:-0.03em; line-height:1.1; background:linear-gradient(135deg,${p.heading},${p.primary}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; margin:0;">
      Presentation Title
    </h1>
    <div class="anim-fade-in-up delay-200" style="width:48px; height:3px; background:${p.primary}; border-radius:2px; margin:1.2rem auto;"></div>
    <p class="anim-fade-in-up delay-300" style="font-family:var(--body-font); font-size:1.2em; color:${p.body}; margin:0; max-width:550px; line-height:1.5;">
      A compelling subtitle that sets the tone
    </p>
  </div>
</section>

<!-- CONTENT SLIDE — bento grid with glass cards -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 0.3em; letter-spacing:-0.02em;">Key Features</h2>
    <div class="anim-fade-in-up delay-100" style="width:48px; height:3px; background:var(--primary); border-radius:2px; margin-bottom:1.5rem;"></div>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;">
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; backdrop-filter:blur(12px);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.10); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Lightning Fast</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Optimized for speed with sub-millisecond response times.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; backdrop-filter:blur(12px);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.10); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Secure by Default</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Enterprise-grade security with zero-trust architecture.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; backdrop-filter:blur(12px);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.10); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Real-Time Analytics</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Live dashboards with instant insights and alerting.</p>
      </div>
    </div>
  </div>
</section>

<!-- METRICS SLIDE — large numbers with context -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 1.5rem; letter-spacing:-0.02em; text-align:center;">By the Numbers</h2>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;">
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; backdrop-filter:blur(12px);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">$4.2M</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Annual Revenue</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 24% YoY</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; backdrop-filter:blur(12px);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">125K</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Active Users</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 18% MoM</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; backdrop-filter:blur(12px);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">99.9%</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Uptime SLA</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">42-day streak</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; backdrop-filter:blur(12px);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">72</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">NPS Score</div>
        <div style="font-size:0.7em; color:#4ade80; margin-top:0.3em;">↑ 8 points</div>
      </div>
    </div>
  </div>
</section>`.trim();
}

function buildLightExampleSlides(p: TemplatePalette): string {
  return `
<!-- TITLE SLIDE — clean hero with accent divider (light mode) -->
<section data-background-color="${p.bg}" data-transition="fade" style="--primary:${p.primary}; --accent:${p.accent}; --bg-dark:${p.bg}; --heading-font:${p.headingFont}; --body-font:${p.bodyFont};">
  <div style="position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:2rem;">
    <div style="display:inline-flex; padding:0.25em 0.75em; border-radius:999px; font-size:0.7em; font-weight:600; letter-spacing:0.03em; background:rgba(${hexToRgb(p.primary)},0.08); color:${p.primary}; border:1px solid rgba(${hexToRgb(p.primary)},0.15); margin-bottom:1.5rem;" class="anim-fade-in-up">
      PRESENTATION
    </div>
    <h1 class="anim-fade-in-up delay-100" style="font-family:var(--heading-font); font-size:3.5em; font-weight:700; letter-spacing:-0.03em; line-height:1.1; color:${p.heading}; margin:0;">
      Presentation Title
    </h1>
    <div class="anim-fade-in-up delay-200" style="width:48px; height:3px; background:${p.primary}; border-radius:2px; margin:1.2rem auto;"></div>
    <p class="anim-fade-in-up delay-300" style="font-family:var(--body-font); font-size:1.2em; color:${p.body}; margin:0; max-width:550px; line-height:1.5;">
      A compelling subtitle that sets the tone
    </p>
  </div>
</section>

<!-- CONTENT SLIDE — clean cards with shadows (light mode) -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 0.3em; letter-spacing:-0.02em;">Key Features</h2>
    <div class="anim-fade-in-up delay-100" style="width:48px; height:3px; background:var(--primary); border-radius:2px; margin-bottom:1.5rem;"></div>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;">
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.08); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Lightning Fast</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Optimized for speed with sub-millisecond response times.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.08); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Secure by Default</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Enterprise-grade security with zero-trust architecture.</p>
      </div>
      <div class="anim-fade-in-up" style="background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(${hexToRgb(p.primary)},0.08); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <h3 style="font-family:var(--heading-font); font-size:1.05em; font-weight:600; color:${p.heading}; margin:0 0 0.4em;">Real-Time Analytics</h3>
        <p style="font-family:var(--body-font); font-size:0.8em; color:${p.body}; margin:0; line-height:1.5;">Live dashboards with instant insights and alerting.</p>
      </div>
    </div>
  </div>
</section>

<!-- METRICS SLIDE — clean metric cards (light mode) -->
<section data-background-color="${p.bg}" data-transition="fade">
  <div style="max-width:90%; margin:0 auto; padding:2rem;">
    <h2 class="anim-fade-in-up" style="font-family:var(--heading-font); font-size:2.2em; font-weight:700; color:${p.heading}; margin:0 0 1.5rem; letter-spacing:-0.02em; text-align:center;">By the Numbers</h2>
    <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;">
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">$4.2M</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Annual Revenue</div>
        <div style="font-size:0.7em; color:#16a34a; margin-top:0.3em;">↑ 24% YoY</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">125K</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Active Users</div>
        <div style="font-size:0.7em; color:#16a34a; margin-top:0.3em;">↑ 18% MoM</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">99.9%</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Uptime SLA</div>
        <div style="font-size:0.7em; color:#16a34a; margin-top:0.3em;">42-day streak</div>
      </div>
      <div class="anim-fade-in-up" style="text-align:center; background:${p.surface}; border:1px solid ${p.border}; border-radius:12px; padding:1.8rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-family:var(--heading-font); font-size:2.8em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">72</div>
        <div style="font-family:var(--body-font); font-size:0.7em; color:${p.muted}; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">NPS Score</div>
        <div style="font-size:0.7em; color:#16a34a; margin-top:0.3em;">↑ 8 points</div>
      </div>
    </div>
  </div>
</section>`.trim();
}

/** Convert a hex color like "#CADCFC" or "rgba(...)" to "r, g, b" for inline rgba(). */
function hexToRgb(color: string): string {
  // If it's already rgba, extract the rgb part
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return match ? `${match[1]}, ${match[2]}, ${match[3]}` : '128, 128, 128';
  }
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function buildExampleSlides(p: TemplatePalette): string {
  return p.mode === 'dark'
    ? buildDarkExampleSlides(p)
    : buildLightExampleSlides(p);
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
  keynote: 'High-impact keynote with Midnight Executive palette (navy + ice blue). Cinematic scene backgrounds, gradient text, bold typography.',
  corporate: 'Professional corporate deck with Ocean Gradient palette (deep blue + teal). Clean layouts, structured data, authoritative tone.',
  tech: 'Modern tech presentation with Charcoal Minimal palette (light, monochrome). Clean shadows, Swiss-inspired, developer-friendly.',
  creative: 'Vibrant creative showcase with Coral Energy palette (coral + gold + navy). Playful typography, bold colors, expressive layouts.',
  minimal: 'Ultra-clean minimal design with Sage Calm palette (sage greens). Maximum whitespace, serene, organic feel.',
  pitch: 'Bold investor pitch deck with Cherry Bold palette (cherry red + navy). High-stakes feeling, dramatic contrast, confident.',
  editorial: 'Elegant storytelling with Berry & Cream palette (berry + dusty rose + cream). Serif typography, magazine-quality feel.',
  scifi: 'Futuristic sci-fi theme with Teal Trust palette (teal + seafoam + mint). Neon accents, electric borders, digital aesthetic.',
  data: 'Data-driven dashboard with Forest & Moss palette (forest green + moss). Growth-oriented, natural, clean data visualizations.',
  educational: 'Warm educational format with Warm Terracotta palette (terracotta + sage). Approachable, clear hierarchy, focused.',
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
