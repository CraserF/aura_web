# AI Skills — Slide Generation

> Structured prompt patterns for AI agents generating reveal.js presentations.
> Each skill describes a task with inputs, steps, and expected output.

---

## Skill 1: Generate a Complete Slide Deck

**Trigger:** User asks for a full presentation on a topic.

**Inputs:**
- `topic` — The presentation subject
- `audience` — Who will see it (executives, developers, students, etc.)
- `slide_count` — Approximate number (default: 15)
- `tone` — Formal, casual, technical, inspirational
- `animation_level` — 1-4 (default: 2)

**Steps:**
1. Read `TEMPLATE-SELECTOR.md` — match inputs to the best template.
2. Copy the template HTML file.
3. Determine the slide structure:
   - Title slide (1)
   - Agenda (1)
   - Section dividers (1 per major topic)
   - Content slides (2-4 per section)
   - Summary (1)
   - Q&A / CTA (1)
4. Replace all `{{PLACEHOLDER}}` markers with generated content.
5. Select appropriate animations per the animation level:
   - Level 1: `anim-fade-in-up` only, no scenes
   - Level 2: Fade + slide entrances, stagger, basic fragments
   - Level 3: Add scene backgrounds (particles/aurora), border effects, diverse entrances
   - Level 4: Full cinematic — letterbox, vignette, nebula/matrix scenes, text shimmer
6. Apply a color palette from the reference matching the domain.
7. Choose appropriate font pairing.
8. Add speaker notes to every slide.

**Output:** A single self-contained HTML file.

---

## Skill 2: Create a Single Slide

**Trigger:** User asks to add one specific slide.

**Inputs:**
- `slide_type` — title | content | data | image | code | quote | divider | cta
- `content` — The information to present
- `animation_level` — 1-4

**Steps:**
1. Generate a `<section>` block matching the slide type.
2. Apply animations appropriate for the type:
   - **title:** `anim-fade-in-up` on heading, gradient text, optional scene background
   - **content:** Staggered `fragment scale-up` on bullets
   - **data:** Metric cards with `anim-stagger`, progress bars, counter animations
   - **image:** Full-bleed background or grid layout, `anim-zoom-in`
   - **code:** `<pre><code>` with `data-line-numbers`, split layout with explanation
   - **quote:** Large italic text, `anim-text-blur-focus`, pull-quote styling
   - **divider:** Large section title, `anim-elastic-in`, accent underline
   - **cta:** Centered, `border-neon`, `anim-pulse` on button-like element
3. Include speaker notes.

**Output:** An HTML `<section>` block ready to insert into a deck.

---

## Skill 3: Add Animation to Existing Slide

**Trigger:** User wants to enhance a plain slide with animations.

**Inputs:**
- `html` — The existing slide HTML
- `animation_level` — 1-4
- `focus_elements` — Which parts to animate (all, headings, lists, images, data)

**Steps:**
1. Parse the slide structure.
2. Add entrance classes to headings (`anim-fade-in-up`, `anim-elastic-in`).
3. Wrap lists in `.anim-stagger` or add `.fragment` classes to `<li>` elements.
4. Add delays to create visual ordering (`.delay-200`, `.delay-400`).
5. For level 3+: add a scene background or border effects.
6. For level 4: add cinematic overlays (vignette, grain).

**Output:** The enhanced HTML with animation classes added.

---

## Skill 4: Create an Animated Scene Background

**Trigger:** User asks for a dynamic background on a slide.

**Inputs:**
- `scene_type` — particles | aurora | nebula | ocean | matrix | geo-grid | starfield | fireflies
- `theme` — dark (default) | light

**Steps:**
1. Generate the container `<div>` with the correct scene class.
2. Add the required child elements (particles, bands, columns, etc.).
3. Position with `style="position:absolute; inset:0; z-index:0;"`.
4. Ensure content above has `position:relative; z-index:1;`.

**Recommended scene → theme mapping:**
| Scene | Good For |
|-------|----------|
| particles | Tech, general, keynotes |
| aurora | Nature, energy, wellness |
| nebula | Space, AI, exploration |
| ocean | Calm, flow, process stories |
| matrix | Cybersecurity, hacking, data |
| geo-grid | Engineering, architecture |
| starfield | Space, astronomy, deep tech |
| fireflies | Creative, nature, whimsy |

**Output:** The complete scene HTML block.

---

## Skill 5: Build a Data-Heavy Slide

**Trigger:** User has numbers, metrics, or charts to present.

**Inputs:**
- `metrics` — Array of {label, value, delta, unit}
- `layout` — cards | table | bars | mixed
- `animation_level` — 1-4

**Steps:**
1. Choose layout:
   - **cards:** Grid of metric cards with large numbers
   - **table:** Styled `<table>` with hover effects
   - **bars:** Progress bars with labels and percentages
   - **mixed:** Cards on top, table or chart below
2. Add animations:
   - Cards: `.anim-stagger` + `.anim-fade-in-up`
   - Numbers: `.number-counter` class with `data-target`
   - Bars: `.progress-bar-animated` with `--target-width`
   - Deltas: Color-code green (positive) / red (negative)
3. For level 3+: add `border-gradient-anim` on cards.
4. For level 4: add scene background behind metrics.

**Output:** A `<section>` with formatted data visualization.

---

## Skill 6: Convert Markdown to Reveal.js Slides

**Trigger:** User provides markdown content to turn into a presentation.

**Inputs:**
- `markdown` — The source markdown text
- `template` — Which template style to use
- `animation_level` — 1-4

**Steps:**
1. Split markdown by `# ` (H1) and `## ` (H2) headings.
2. Each H1 becomes a horizontal section divider slide.
3. Each H2 becomes a content slide.
4. Convert:
   - `**bold**` → `<strong>`
   - `*italic*` → `<em>`
   - `- item` → `<li class="fragment scale-up">`
   - `` `code` `` → `<code>`
   - `> quote` → pull-quote styled `<blockquote>`
   - `![alt](url)` → `<img>` with animation
5. Apply template styling and color scheme.
6. Add animations per the level.
7. Generate speaker notes from surrounding context.

**Output:** Complete HTML presentation file.

---

## Skill 7: Theme / Rebrand a Presentation

**Trigger:** User wants to change colors, fonts, or style of an existing deck.

**Inputs:**
- `html` — The existing presentation HTML
- `primary_color` — New primary color
- `accent_color` — New accent color
- `font_heading` — New heading font (optional)
- `font_body` — New body font (optional)
- `dark_mode` — true | false

**Steps:**
1. Update CSS custom properties in `:root {}`.
2. If fonts changed, update the Google Fonts `<link>` URL.
3. If switching light ↔ dark:
   - Swap background and text colors
   - Adjust shadow intensities
   - Update gradient stops
4. Preserve all animation classes (they are color-independent).
5. Update any hard-coded color values in inline styles.

**Output:** The rebranded HTML file.

---

## Skill 8: Generate Speaker Notes

**Trigger:** User has slides but no speaker notes.

**Inputs:**
- `html` — The presentation HTML
- `style` — brief | detailed | scripted
- `audience` — Context about who is watching

**Steps:**
1. Parse each `<section>` (slide).
2. For each slide, generate notes:
   - **brief:** 1-2 bullet points of key talking points
   - **detailed:** 3-5 sentences with transition cues
   - **scripted:** Full paragraph script with timing marks
3. Insert as `<aside class="notes">` at the end of each `<section>`.
4. Add transition cues: "Next, we'll look at..." / "Building on that..."

**Output:** The HTML with notes added to every slide.

---

## Quick Decision Matrix

| User Says | Use Skill |
|-----------|-----------|
| "Make a presentation about X" | Skill 1 |
| "Add a slide for Y" | Skill 2 |
| "Make this slide more animated" | Skill 3 |
| "Add a cool background" | Skill 4 |
| "Show these numbers nicely" | Skill 5 |
| "Turn this markdown into slides" | Skill 6 |
| "Change the colors to blue" | Skill 7 |
| "Add speaker notes" | Skill 8 |
