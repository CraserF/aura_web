/**
 * Animation section — animation framework, level-specific guidance.
 */

const ANIMATION_LEVEL_GUIDANCE: Record<1 | 2 | 3 | 4, string> = {
  1: 'Use ONLY `.anim-fade-in-up` for entrances. Fragments: `.fragment.fade-in` only. No scene backgrounds. Minimal delays (`.delay-200` max). Clean, professional motion.',
  2: 'Use `.anim-fade-in-up`, `.anim-fade-in-left/right` for variety. Stagger containers (`.anim-stagger`) on card grids. Fragments: `.fragment.scale-up`, `.fragment.slide-up`. Delays up to `.delay-400`. Accent lines and glassmorphism cards.',
  3: 'Use elastic/bounce entrances (`.anim-elastic-in`, `.anim-bounce-in-up`). Add `scene-particles` or `scene-aurora` on the title slide. Use `.anim-text-shimmer` on hero titles. Animated borders (`.border-gradient-anim`) on featured cards. Stagger everything. Use `.fragment.wipe-right`, `.fragment.glow`.',
  4: 'Full scene backgrounds (particles, aurora, starfield) on 2-3 slides. `.anim-typewriter` on hero title. `.anim-reveal-circle` for dramatic reveals. `.border-neon` on key cards. `.anim-text-shimmer` + `.anim-float` on decorative elements. `.bg-gradient-shift` on transition slides. Layer multiple effects per slide.',
};

export function buildAnimationSection(animLevel: 1 | 2 | 3 | 4): string {
  return `## ANIMATION FRAMEWORK

### Entrance Animations (trigger on slide visible):
\`.anim-fade-in-up\` \`.anim-fade-in-down\` \`.anim-fade-in-left\` \`.anim-fade-in-right\` \`.anim-fade-in-scale\`
\`.anim-zoom-in\` \`.anim-zoom-in-bounce\` \`.anim-elastic-in\` \`.anim-bounce-in\` \`.anim-bounce-in-up\`
\`.anim-flip-in-x\` \`.anim-flip-in-y\` \`.anim-reveal-circle\` \`.anim-reveal-wipe-right\` \`.anim-reveal-diamond\`

### Stagger Container (auto-delays children):
\`\`\`html
<div class="anim-stagger" style="display:grid; ...">
  <div class="anim-fade-in-up">...</div>
  <div class="anim-fade-in-up">...</div>
</div>
\`\`\`

### Fragment Extensions (click-to-reveal):
\`.fragment.blur\` \`.fragment.scale-up\` \`.fragment.slide-up\` \`.fragment.bounce\` \`.fragment.wipe-right\` \`.fragment.glow\`

### Text Effects:
\`.anim-text-shimmer\` (moving highlight) \`.anim-typewriter\` (set \`--tw-chars:N\`) \`.anim-text-glow\`

### Emphasis (add \`.anim-infinite\` for continuous):
\`.anim-pulse\` \`.anim-heartbeat\` \`.anim-float\`

### Timing: \`.delay-100\` through \`.delay-2000\` (100ms steps) | \`.duration-fast\` \`.duration-normal\` \`.duration-slow\`

### Scene Backgrounds (place inside \`<section>\`, before content div):
\`\`\`html
<!-- Particles -->
<div class="scene-particles"><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div></div>
<!-- Aurora -->
<div class="scene-aurora"><div class="aurora-band"></div><div class="aurora-band"></div><div class="aurora-band"></div></div>
<!-- Starfield -->
<div class="scene-starfield"><div class="star-layer"></div><div class="star-layer"></div><div class="star-layer"></div></div>
<!-- Fireflies -->
<div class="scene-fireflies"><div class="firefly"></div><div class="firefly"></div><div class="firefly"></div><div class="firefly"></div><div class="firefly"></div></div>
\`\`\`
Content after scene: \`<div style="position:relative; z-index:1;">\`

### Animated Borders: \`.border-gradient-anim\` \`.border-neon\` (set \`--neon-color\`) \`.border-draw\`
### Background: \`class="bg-gradient-shift"\` with \`--grad-1\`, \`--grad-2\`, \`--grad-3\` vars

## ANIMATION LEVEL: ${animLevel}
${ANIMATION_LEVEL_GUIDANCE[animLevel]}`;
}
