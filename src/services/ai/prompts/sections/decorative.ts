/**
 * Decorative elements section — mode-aware gradient text, accent dividers, SVG icons.
 */
import type { TemplatePalette } from '../../templates';

export function buildDecorativeSection(pal?: TemplatePalette): string {
  const mode = pal?.mode ?? 'dark';

  const heroTextRecipe = mode === 'dark'
    ? `### Gradient Text (for hero titles on DARK backgrounds only):
\`\`\`html
<h1 style="background:linear-gradient(135deg,${pal?.heading ?? '#fff'},${pal?.primary ?? '#3b82f6'}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">
\`\`\``
    : `### Hero Title (LIGHT mode — solid color, NO gradient text):
\`\`\`html
<h1 style="color:${pal?.heading ?? '#0f172a'}; font-weight:700;">Title Here</h1>
<div style="width:48px; height:3px; background:${pal?.primary ?? '#3b82f6'}; border-radius:2px; margin:0.8rem 0;"></div>
\`\`\`
**IMPORTANT:** Do NOT use gradient text on light backgrounds. The contrast is too low and it looks washed out. Use solid heading color with a colored accent divider instead.`;

  const geometricDecoration = mode === 'dark'
    ? `### Geometric Decorations (floating glow shapes for dark mode):
\`\`\`html
<div style="position:absolute; top:-80px; right:-60px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,${pal?.primary ?? '#3b82f6'}15,transparent 70%); pointer-events:none;"></div>
\`\`\``
    : `### Geometric Decorations (subtle shapes for light mode):
\`\`\`html
<div style="position:absolute; top:-80px; right:-60px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,${pal?.primary ?? '#3b82f6'}08,transparent 70%); pointer-events:none;"></div>
\`\`\`
Use very subtle opacity (08 hex = 3%) for geometric shapes on light backgrounds.`;

  return `## DECORATIVE ELEMENTS — CSS-Only Visual Richness

Instead of images, use these techniques to make slides visually stunning:

${heroTextRecipe}

### Accent Dividers (place below every h2):
\`\`\`html
<div style="width:48px; height:3px; background:var(--primary); border-radius:2px; margin:0.8rem 0 1.5rem;"></div>
\`\`\`

### Icon Containers (solid tinted background + inline SVG):
\`\`\`html
<div style="width:44px; height:44px; border-radius:10px; background:rgba(${pal?.primary ?? '59,130,246'}${mode === 'dark' ? ',0.10' : ',0.08'}); display:flex; align-items:center; justify-content:center;">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${pal?.primary ?? '#3b82f6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</svg>
</div>
\`\`\`

${geometricDecoration}

### CSS-Only Illustrations (abstract shapes):
\`\`\`html
<div style="width:300px; height:300px; position:relative;">
  <div style="position:absolute; inset:20%; border-radius:30% 70% 70% 30% / 30% 30% 70% 70%; background:linear-gradient(135deg,var(--primary),var(--accent)); opacity:${mode === 'dark' ? '0.2' : '0.08'};"></div>
  <div style="position:absolute; inset:10%; border:2px solid ${pal?.border ?? 'rgba(255,255,255,0.1)'}; border-radius:50%;"></div>
</div>
\`\`\`

### Progress / Gauge (conic gradient):
\`\`\`html
<div style="width:100px; height:100px; border-radius:50%; background:conic-gradient(var(--primary) 0% 73%, ${pal?.surface ?? 'rgba(255,255,255,0.05)'} 73% 100%); display:flex; align-items:center; justify-content:center;">
  <div style="width:70px; height:70px; border-radius:50%; background:${pal?.bg ?? '#0f172a'}; display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--primary); font-size:1.1em;">73%</div>
</div>
\`\`\`

### Inline SVG Icons (use instead of emoji for premium feel):
Common icons — copy these exactly:
- **Lightning:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>\`
- **Lock:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>\`
- **Chart:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\`
- **Check:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>\`
- **Star:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>\`
- **Users:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>\`
- **Globe:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>\`
- **Arrow Right:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>\`
- **Code:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>\`
- **Layers:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>\`
- **Rocket:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></svg>\``;
}
