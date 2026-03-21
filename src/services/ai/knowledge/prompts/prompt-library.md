# Predefined Prompt Library

> Ready-to-use prompts for generating reveal.js presentations.
> Copy a prompt, fill in the `[brackets]`, and send to an LLM.

---

## Quick Reference

| Prompt | Use Case | Slides |
|--------|----------|--------|
| [Full Deck — Topic Brief](#1-full-deck--topic-brief) | Generate a full presentation from a one-liner | 10-20 |
| [Full Deck — Detailed Brief](#2-full-deck--detailed-brief) | Generate from structured requirements | 10-25 |
| [Keynote Announcement](#3-keynote-announcement) | Product launch or major announcement | 12-18 |
| [Technical Architecture Review](#4-technical-architecture-review) | System design walkthrough | 10-15 |
| [Data & Metrics Report](#5-data--metrics-report) | Dashboard or KPI review | 8-12 |
| [Investor Pitch Deck](#6-investor-pitch-deck) | Fundraising pitch | 10-12 |
| [Workshop / Training](#7-workshop--training) | Interactive teaching session | 12-20 |
| [Code Walkthrough](#8-code-walkthrough) | Developer demo or tutorial | 10-15 |
| [Comparison / Versus](#9-comparison--versus) | Head-to-head analysis | 8-10 |
| [Product Demo](#10-product-demo) | SaaS feature walkthrough | 10-14 |
| [Timeline / Roadmap](#11-timeline--roadmap) | Project plan or history | 8-12 |
| [Case Study / Story](#12-case-study--story) | Narrative-driven recap | 10-15 |
| [Single Slide — Metric Card](#13-single-slide--metric-card) | One data slide | 1 |
| [Single Slide — Quote](#14-single-slide--quote) | One quote slide | 1 |
| [Add Animations to Existing Deck](#15-add-animations-to-existing-deck) | Enhance plain HTML | — |
| [Rebrand Existing Deck](#16-rebrand-existing-deck) | Change colors/fonts | — |
| [Convert Markdown to Deck](#17-convert-markdown-to-deck) | Markdown → reveal.js | — |

---

## 1. Full Deck — Topic Brief

**When to use:** You have a topic and need a complete deck fast.

```
Create a reveal.js presentation about [TOPIC].

Audience: [AUDIENCE — e.g., executives, developers, students]
Tone: [TONE — formal, casual, technical, inspirational]
Slide count: [NUMBER — default 15]
Animation level: [1-4 — 1=subtle, 2=moderate, 3=immersive, 4=cinematic]

Requirements:
- Use the revealjs-slides framework (read TEMPLATE-SELECTOR.md first)
- Pick the best template from templates/
- Replace ALL {{PLACEHOLDER}} markers
- Include speaker notes on every slide
- Use animations from animations/core-animations.css
- Choose a font pairing from reference/icons-and-fonts.md
- Output a single self-contained HTML file
```

---

## 2. Full Deck — Detailed Brief

**When to use:** You have structured requirements and want precise control.

```
Create a reveal.js presentation with these specifications:

CONTENT:
- Title: [TITLE]
- Subtitle: [SUBTITLE]
- Speaker: [NAME]
- Date: [DATE]
- Company: [COMPANY]

STRUCTURE:
- Opening: [HOOK — question, statistic, bold statement]
- Sections:
  1. [SECTION 1 TITLE] — [key points]
  2. [SECTION 2 TITLE] — [key points]
  3. [SECTION 3 TITLE] — [key points]
- Closing: [CTA or summary approach]

STYLE:
- Template: [TEMPLATE NAME from templates/]
- Animation level: [1-4]
- Color palette: primary=[HEX], accent=[HEX]
- Font theme: [from reference/icons-and-fonts.md — e.g., "Tech", "Corporate"]
- Icon set: [from reference/icons-and-fonts.md — e.g., "Lucide", "Phosphor"]

REQUIREMENTS:
- Use the revealjs-slides framework
- Read reference/components.md for reusable slide components
- Include speaker notes
- Add progressive disclosure (fragments) on content-heavy slides
- Output a single self-contained HTML file
```

---

## 3. Keynote Announcement

**When to use:** Product launch, major announcement, conference talk.

```
Create a cinematic keynote presentation.

Topic: [WHAT ARE YOU ANNOUNCING]
Company: [COMPANY]
Speaker: [NAME, TITLE]
Key message: [THE ONE THING the audience should remember]

Structure (12-18 slides):
1. Opening — bold statement or question, particle/nebula background
2. The problem or opportunity (2-3 slides)
3. The big reveal / announcement (dramatic, gradient text)
4. Key features or benefits (3-4 slides with animated cards)
5. Demo or proof (screenshot frames or video embed)
6. Social proof — testimonials, partners, metrics
7. What's next — timeline or roadmap
8. Call to action — clear next step

Style:
- Template: template-keynote.html
- Animation level: 4 (cinematic)
- Use scene backgrounds (particles, nebula, or aurora)
- Gradient text on key headings
- Letterbox + vignette on dramatic slides
- Staggered fragment reveals throughout
- Include Three.js 3D background on title slide
- Speaker notes on every slide

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 4. Technical Architecture Review

**When to use:** System design, architecture overview, RFC presentation.

```
Create a technical architecture presentation.

System: [SYSTEM NAME]
Audience: [engineering team / CTO / mixed technical]
Scope: [What part of the system — full overview / specific service / migration plan]

Key components to cover:
- [COMPONENT 1]: [brief description]
- [COMPONENT 2]: [brief description]
- [COMPONENT 3]: [brief description]

Structure (10-15 slides):
1. Title + system overview
2. Architecture diagram (visual boxes + arrows)
3. Component deep-dives (1-2 slides each)
4. Data flow (how requests traverse the system)
5. Technology stack (badge grid)
6. Performance metrics (if applicable)
7. Challenges / trade-offs
8. Next steps / open questions

Style:
- Template: template-tech-architecture.html
- Animation level: 3
- Use terminal-style code blocks for configs
- Service boxes with connection lines
- Fragment reveals for step-by-step data flow
- Dark theme with code syntax highlighting
- Speaker notes explaining architectural decisions

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 5. Data & Metrics Report

**When to use:** QBR, analytics review, dashboard-style presentation.

```
Create a data-focused presentation.

Report title: [TITLE]
Period: [TIME PERIOD — Q1 2026, March 2026, YTD]
Audience: [executives, team, stakeholders]

Key metrics to present:
- [METRIC 1]: [value] ([change — e.g., +12% vs last quarter])
- [METRIC 2]: [value] ([change])
- [METRIC 3]: [value] ([change])
- [METRIC 4]: [value] ([change])

Narrative:
- Highlight: [WHAT WENT WELL]
- Challenge: [WHAT NEEDS ATTENTION]
- Action: [NEXT STEPS]

Structure (8-12 slides):
1. Title + executive summary
2. KPI overview (metric cards with counters)
3. Trend analysis (progress bars or charts)
4. Deep-dive: [specific area]
5. Comparison (vs target, vs previous period)
6. Insights & recommendations
7. Action items
8. Appendix (optional detailed tables)

Style:
- Template: template-data-dashboard.html
- Animation level: 2-3
- Use .number-counter for animated metric values
- .progress-bar-animated for comparisons
- Green for positive deltas, red for negative
- Clean grid layouts from reference/components.md
- Speaker notes with data source references

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 6. Investor Pitch Deck

**When to use:** Fundraising, investor meetings, demo day.

```
Create an investor pitch deck.

Company: [COMPANY NAME]
Tagline: [ONE-LINE DESCRIPTION]
Stage: [pre-seed / seed / Series A / B / etc.]
Ask: [AMOUNT RAISING]

Key information:
- Problem: [THE PROBLEM YOU SOLVE]
- Solution: [YOUR SOLUTION — 1-2 sentences]
- Market size: TAM=[SIZE], SAM=[SIZE], SOM=[SIZE]
- Traction: [KEY METRICS — users, revenue, growth rate]
- Business model: [HOW YOU MAKE MONEY]
- Team: [KEY TEAM MEMBERS — name, role, credential]
- Use of funds: [HOW THE RAISE WILL BE USED]

Structure (10-12 slides):
1. Title + tagline
2. Problem (pain point visualization)
3. Solution (clear value prop)
4. Product (screenshot or demo frame)
5. Market size (TAM/SAM/SOM circles)
6. Traction (animated counter metrics)
7. Business model (revenue streams)
8. Roadmap (timeline with milestones)
9. Team (avatar cards)
10. The Ask (amount + use-of-funds progress bars)
11. Closing + contact info

Style:
- Template: template-pitch-deck.html
- Animation level: 3
- Professional but not boring — subtle scene background on title
- Metric cards with number counters
- Use TAM/SAM/SOM nested circles diagram
- Clean typography, no clutter
- Speaker notes with talking points for each slide

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 7. Workshop / Training

**When to use:** Interactive sessions, hands-on training, bootcamps.

```
Create a workshop presentation.

Workshop title: [TITLE]
Duration: [TIME — e.g., 2 hours]
Level: [beginner / intermediate / advanced]
Audience: [WHO IS ATTENDING]

Learning objectives:
1. [OBJECTIVE 1]
2. [OBJECTIVE 2]
3. [OBJECTIVE 3]

Workshop structure:
- Module 1: [TOPIC] — [DURATION] — [teach + exercise]
- Module 2: [TOPIC] — [DURATION] — [teach + exercise]
- Module 3: [TOPIC] — [DURATION] — [teach + exercise]
- (optional) Group activity: [DESCRIPTION]

Style:
- Template: template-workshop.html
- Animation level: 2
- Include exercise slides with step-by-step instructions
- Add hint/solution toggle boxes
- Progress tracker across the workshop
- Timer indication on exercise slides
- Break slide between modules
- Recap checklist at the end
- Speaker notes with facilitation tips

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 8. Code Walkthrough

**When to use:** Developer demos, code reviews, technical tutorials.

```
Create a code walkthrough presentation.

Topic: [WHAT CODE/CONCEPT ARE YOU EXPLAINING]
Language: [PROGRAMMING LANGUAGE]
Audience: [junior devs / senior devs / mixed]
Prerequisite knowledge: [WHAT THEY SHOULD ALREADY KNOW]

Code to walk through:
```[LANGUAGE]
[PASTE YOUR CODE HERE OR DESCRIBE THE FLOW]
```

Structure (10-15 slides):
1. Title + what we're building
2. Prerequisites / setup
3. Step-by-step code build (split layout: code left, explanation right)
4. Key concept explanations (with callout boxes)
5. Running the code (terminal output slide)
6. Common pitfalls / debugging tips
7. Full code recap
8. Next steps / resources

Style:
- Template: template-code-walkthrough.html
- Animation level: 3
- Split code/explanation layout (60/40)
- data-line-numbers for step-through highlights
- Terminal output panels for results
- Callout boxes (tip, warning, info)
- Syntax highlighting via RevealHighlight plugin
- Speaker notes with explanation script

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 9. Comparison / Versus

**When to use:** Tool evaluation, A vs B analysis, migration decisions.

```
Create a comparison presentation.

Title: [OPTION A] vs [OPTION B]
Context: [WHY ARE WE COMPARING THESE]
Audience: [WHO DECIDES — technical leads, management, team]
Decision needed: [WHAT DECISION THIS INFORMS]

Comparison criteria:
- [CRITERION 1]: A=[RATING/VALUE], B=[RATING/VALUE]
- [CRITERION 2]: A=[RATING/VALUE], B=[RATING/VALUE]
- [CRITERION 3]: A=[RATING/VALUE], B=[RATING/VALUE]
- [CRITERION 4]: A=[RATING/VALUE], B=[RATING/VALUE]
- [CRITERION 5]: A=[RATING/VALUE], B=[RATING/VALUE]

Additional context:
- Cost: A=[COST], B=[COST]
- Timeline: [IMPLEMENTATION CONSIDERATIONS]
- Recommendation: [YOUR RECOMMENDATION AND WHY]

Style:
- Template: template-comparison.html
- Animation level: 2
- Side-by-side layout with VS badge
- Feature matrix with status badges (yes/no/partial)
- Animated score bars for criteria
- Use-case matrix
- Clear verdict slide
- Speaker notes with nuances behind each score

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 10. Product Demo

**When to use:** SaaS demo, feature showcase, customer presentation.

```
Create a product demo presentation.

Product: [PRODUCT NAME]
Tagline: [SHORT TAGLINE]
Audience: [prospects / customers / internal stakeholders]
Demo goal: [WHAT OUTCOME — buy, upgrade, adopt internally]

Features to showcase:
1. [FEATURE 1]: [BENEFIT]
2. [FEATURE 2]: [BENEFIT]
3. [FEATURE 3]: [BENEFIT]

Demo flow:
- Pain point → solution connection
- Key workflow walkthrough
- Integration highlights (if applicable)
- Pricing (if applicable)

Style:
- Template: template-product-demo.html
- Animation level: 3
- Browser-frame chrome for screenshots
- Step-by-step workflow diagrams
- Integration grid for logos
- Testimonial cards for social proof
- Dual-button CTA on closing
- Speaker notes with demo talking points

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 11. Timeline / Roadmap

**When to use:** Project plans, release roadmaps, history retrospectives.

```
Create a timeline/roadmap presentation.

Title: [PROJECT/PRODUCT NAME] Roadmap
Period: [TIME SPAN — e.g., 2025-2027]
Audience: [stakeholders, team, investors]
Purpose: [communicate plan / celebrate progress / align on priorities]

Timeline phases:
- Phase 1: [NAME] — [STATUS: done/in-progress/planned] — [KEY ITEMS]
- Phase 2: [NAME] — [STATUS] — [KEY ITEMS]
- Phase 3: [NAME] — [STATUS] — [KEY ITEMS]
- Phase 4: [NAME] — [STATUS] — [KEY ITEMS]
- Phase 5: [NAME] — [STATUS] — [KEY ITEMS]

Key milestones:
- [MILESTONE 1]: [DATE] — [SIGNIFICANCE]
- [MILESTONE 2]: [DATE] — [SIGNIFICANCE]
- [MILESTONE 3]: [DATE] — [SIGNIFICANCE]

Style:
- Template: template-timeline.html
- Animation level: 3
- Horizontal roadmap overview with phase nodes
- Vertical detail slides for current/next phase
- Status indicators (completed, in-progress, planned)
- Achievement metrics row
- Risks & dependencies slide
- Speaker notes with timeline rationale

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 12. Case Study / Story

**When to use:** Client case studies, project retrospectives, narrative presentations.

```
Create a storytelling presentation.

Story: [WHAT HAPPENED — brief summary]
Client/Subject: [NAME] (anonymize if needed)
Audience: [WHO WILL SEE THIS]
Goal: [learn from it / sell similar work / celebrate success]

Narrative arc:
- Setup: [CONTEXT — who, what, when, where]
- Challenge: [THE PROBLEM THEY FACED]
- Journey: [WHAT WAS DONE — 3-5 key steps]
- Climax: [THE TURNING POINT OR KEY RESULT]
- Resolution: [OUTCOME WITH METRICS]
- Takeaway: [LESSON OR CTA]

Style:
- Template: template-storytelling.html
- Animation level: 3
- Chapter dividers between narrative sections
- Full-bleed background images where appropriate
- Pull quotes for key statements
- Before/after cards for results
- Timeline for the journey section
- Speaker notes with storytelling cues

Output: Single self-contained HTML file using the revealjs-slides framework.
```

---

## 13. Single Slide — Metric Card

**When to use:** Add one data-heavy slide to an existing deck.

```
Create a single reveal.js slide with these metrics:

Metrics:
- [LABEL 1]: [VALUE] ([DELTA — e.g., +12%])
- [LABEL 2]: [VALUE] ([DELTA])
- [LABEL 3]: [VALUE] ([DELTA])
- [LABEL 4]: [VALUE] ([DELTA])

Layout: [cards | bars | table | mixed]
Animation level: [1-4]

Use metric card components from reference/components.md.
Add .number-counter with data-target for animated values.
Color-code deltas: green for positive, red for negative.
Include speaker notes.

Output: A single <section> block ready to paste into a deck.
```

---

## 14. Single Slide — Quote

**When to use:** Add an impactful quote slide.

```
Create a single reveal.js quote slide.

Quote: "[THE QUOTE TEXT]"
Attribution: [SPEAKER NAME, TITLE/ROLE]
Style: [minimal | dramatic | card]
Animation level: [1-4]

For dramatic:
- Large italic text
- .anim-text-blur-focus entrance
- Subtle scene background (aurora or particles)
- Vignette overlay

For minimal:
- Clean centered layout
- .anim-fade-in-up entrance

Include speaker notes.
Output: A single <section> block.
```

---

## 15. Add Animations to Existing Deck

**When to use:** Enhance a plain reveal.js deck with animations.

```
Add animations to this reveal.js presentation.

Animation level: [1-4]
Focus: [all elements | headings only | lists | data | images]

Rules:
- Read reference/animation-cheatsheet.md for all available classes
- Level 1: .anim-fade-in-up only, no scenes
- Level 2: Fade + slide entrances, .anim-stagger, basic .fragment
- Level 3: Add scene backgrounds, border effects, diverse entrances
- Level 4: Full cinematic — letterbox, vignette, text shimmer, scene backgrounds
- Add delay classes (.delay-200, .delay-400) for visual ordering
- Use .anim-stagger on card grids and list containers
- Add .fragment scale-up to list items
- Don't break existing layout or content

Here is the HTML to enhance:
```html
[PASTE EXISTING HTML]
```

Output: The enhanced HTML with animation classes added.
```

---

## 16. Rebrand Existing Deck

**When to use:** Change colors, fonts, or visual theme of an existing deck.

```
Rebrand this reveal.js presentation.

New brand:
- Primary color: [HEX]
- Accent color: [HEX]
- Background: [dark | light] — default bg color: [HEX]
- Heading font: [FONT NAME]
- Body font: [FONT NAME]
- Company name: [COMPANY]

Rules:
- Read reference/icons-and-fonts.md for font import URLs
- Update :root CSS custom properties
- Update the Google Fonts <link> URL
- If switching dark ↔ light: swap background/text colors, adjust shadows
- Preserve all animation classes (they are color-independent)
- Replace any hard-coded color values
- Update {{COMPANY}} placeholders

Here is the HTML to rebrand:
```html
[PASTE EXISTING HTML]
```

Output: The rebranded HTML file.
```

---

## 17. Convert Markdown to Deck

**When to use:** Turn markdown notes into a polished presentation.

```
Convert this markdown into a reveal.js presentation.

Template style: [TEMPLATE NAME — e.g., corporate, keynote, educational]
Animation level: [1-4]
Audience: [WHO WILL SEE THIS]

Conversion rules:
- # H1 → horizontal section divider slide
- ## H2 → content slide
- ### H3 → sub-heading within a slide
- Bullet lists → .fragment scale-up items
- **bold** → <strong>
- > blockquote → pull-quote styled section
- Code blocks → syntax-highlighted <pre><code>
- Images → <img> with animation
- Tables → styled data table from components.md
- Horizontal rules (---) → new slide break
- Generate speaker notes from surrounding context

Markdown content:
```markdown
[PASTE MARKDOWN HERE]
```

Output: Complete HTML file using the revealjs-slides framework.
```

---

## Tips for Better Results

### Do:
- Always specify the animation level (1-4)
- Name the template you want, or ask the LLM to pick one using TEMPLATE-SELECTOR.md
- Give concrete content — real numbers, real titles, real names
- Mention specific files from this framework (reference/components.md, etc.)
- Ask for speaker notes on every slide

### Don't:
- Leave the LLM to guess the audience or tone
- Ask for "something cool" — be specific about what "cool" means (e.g., "cinematic with nebula scenes")
- Skip the animation level — this one parameter controls 80% of the visual intensity
- Forget to mention self-contained HTML output (some LLMs will output snippets otherwise)

### Power Moves:
- Chain prompts: use prompt #2 first, then #15 to add animations, then #16 to rebrand
- Use #13/#14 to add individual slides to an existing deck
- Reference specific components: "use the three-tier pricing table from reference/components.md"
- Reference specific icon sets: "use Lucide icons from reference/icons-and-fonts.md"
