/**
 * Animation section — CSS @keyframes animation framework for standalone HTML slides.
 *
 * Every slide must define its own @keyframes in the <style> block.
 * Level-specific guidance controls how many and how complex the animations are.
 */

const ANIMATION_LEVEL_GUIDANCE: Record<1 | 2 | 3 | 4, string> = {
  1: 'Use 1-2 simple entrance animations (fadeInUp, fadeIn). No background scene animations. Minimal delays. Clean, professional motion only.',
  2: 'Use 2-4 animations including entrances (fadeInUp, fadeInScale) and at least one continuous animation (bob, breathe, dotPulse, streamFlow). Stagger animation-delay on groups. Simple SVG animations on background elements.',
  3: 'Use 4-6 animations. Include entrance, continuous, and flowing effects (waveFlow, streamFlow, particleUp). Add ripple effects on nexus points. Full SVG background scene with animated elements. Use staggered delays extensively.',
  4: 'Use 6+ animations with complex orchestration. Include draw-in effects (svgDrawIn), flowing data streams (floatData, particleUp), pulsing indicators (blinkLED, serverScan), wave bands, and particle systems. Full-canvas animated SVG scene. Layer multiple effects per element.',
};

export function buildAnimationSection(animLevel: 1 | 2 | 3 | 4): string {
  return `## CSS ANIMATION FRAMEWORK

All animations must be defined as @keyframes in the \`<style>\` block. Apply via CSS classes or inline style attributes on elements.

### Core @keyframes Library (copy the ones you need into your <style> block):

#### Entrance Animations (play once):
\`\`\`css
@keyframes fadeInUp {
  from { opacity:0; transform:translateY(20px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes fadeInScale {
  from { opacity:0; transform:scale(0.9); }
  to   { opacity:1; transform:scale(1); }
}
\`\`\`

#### Continuous Oscillation (infinite):
\`\`\`css
@keyframes bob {
  0%, 100% { transform:translateY(0); }
  50%      { transform:translateY(-7px); }
}
@keyframes breathe {
  0%, 100% { opacity:1; }
  50%      { opacity:0.5; }
}
@keyframes dotPulse {
  0%, 100% { transform:scale(1);   opacity:1; }
  50%      { transform:scale(1.6); opacity:0.4; }
}
\`\`\`

#### Flowing / Streaming (infinite):
\`\`\`css
@keyframes waveFlow {
  from { transform:translateX(0); }
  to   { transform:translateX(-320px); }
}
@keyframes streamFlow {
  to { stroke-dashoffset:-40; }
}
\`\`\`

#### Expansion / Ripple (infinite):
\`\`\`css
@keyframes rippleOut {
  0%   { transform:scale(0.2); opacity:0.7; }
  100% { transform:scale(1.6); opacity:0; }
}
\`\`\`

#### Particle / Data Effects (infinite):
\`\`\`css
@keyframes particleUp {
  0%   { transform:translateY(0); opacity:0; }
  20%  { opacity:1; }
  100% { transform:translateY(-60px); opacity:0; }
}
@keyframes floatData {
  0%   { transform:translateY(0) translateX(0); opacity:0; }
  20%  { opacity:0.7; }
  80%  { opacity:0.4; }
  100% { transform:translateY(-40px) translateX(8px); opacity:0; }
}
\`\`\`

#### Blinking / Scanning (infinite):
\`\`\`css
@keyframes blinkLED {
  0%, 100% { opacity:0.4; }
  50%      { opacity:1; }
}
@keyframes serverScan {
  0%   { transform:translateY(-100%); opacity:0; }
  10%  { opacity:0.6; }
  90%  { opacity:0.6; }
  100% { transform:translateY(200%); opacity:0; }
}
\`\`\`

#### Rotation:
\`\`\`css
@keyframes spin {
  from { transform:rotate(0deg); }
  to   { transform:rotate(360deg); }
}
\`\`\`

### Animation Timing Cheatsheet:
| Property | Values |
|----------|--------|
| Duration | 1.2s (blink), 2-3s (bob/pulse), 3-4s (particle), 8s (wave scroll) |
| Timing function | ease-in-out (oscillation), linear (scroll/spin), ease-out (particles) |
| Iteration | \`infinite\` for decorative, once for entrances |
| Stagger delay | +0.2-0.4s per element in a group |

### Staggering Pattern:
For groups of similar elements, increment animation-delay:
\`\`\`css
.stagger-1 { animation-delay: 0s; }
.stagger-2 { animation-delay: 0.3s; }
.stagger-3 { animation-delay: 0.6s; }
.stagger-4 { animation-delay: 0.9s; }
\`\`\`
Or use inline \`style="animation-delay: 0.3s"\` on SVG elements.

### Performance Rules:
- **Only animate \`transform\` and \`opacity\`** — never width, height, top, left, margin, padding
- Use \`will-change: transform\` sparingly on heavily animated elements
- Keep total animated elements under ~50 per slide for 60fps
- For SVG animations: set \`transform-box: fill-box\` and \`transform-origin: center\` on the element

## ANIMATION LEVEL: ${animLevel}
${ANIMATION_LEVEL_GUIDANCE[animLevel]}`;
}
