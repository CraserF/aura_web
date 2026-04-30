export const editorialStageLayoutIds = [
  'cover',
  'section-divider',
  'big-number',
  'story-split',
  'media-grid',
  'process-pipeline',
  'question-hero',
  'big-quote',
  'comparison',
  'lead-media',
  'decision',
  'closing-action',
] as const;

export type EditorialStageLayoutId = (typeof editorialStageLayoutIds)[number];
export type EditorialStageSlotKind =
  | 'kicker'
  | 'title'
  | 'subtitle'
  | 'paragraph'
  | 'quote'
  | 'metric-value'
  | 'metric-label'
  | 'step-title'
  | 'step-body'
  | 'label'
  | 'footer';

export interface EditorialStageSlot {
  id: string;
  kind: EditorialStageSlotKind;
  required: boolean;
  maxLength: number;
}

export interface EditorialStageMediaSlot {
  id: string;
  required: boolean;
  aspectRatios: readonly ['16:9' | '16:10' | '4:3' | '3:2' | '1:1' | '3:4', ...Array<'16:9' | '16:10' | '4:3' | '3:2' | '1:1' | '3:4'>];
  cropModes: readonly ['contain' | 'cover-top' | 'cover-center', ...Array<'contain' | 'cover-top' | 'cover-center'>];
  purpose: string;
}

export interface EditorialStageLayout {
  id: EditorialStageLayoutId;
  label: string;
  role: string;
  defaultMood: 'hero-light' | 'hero-dark' | 'light' | 'dark';
  defaultDensity: 'calm' | 'balanced' | 'dense';
  motion: 'hero' | 'cascade' | 'quote' | 'directional' | 'pipeline' | 'static';
  slots: readonly EditorialStageSlot[];
  mediaSlots: readonly EditorialStageMediaSlot[];
  template: string;
}

const slot = (
  id: string,
  kind: EditorialStageSlotKind,
  required: boolean,
  maxLength: number,
): EditorialStageSlot => ({ id, kind, required, maxLength });

const mediaSlot = (
  id: string,
  purpose: string,
  required: boolean,
  aspectRatios: EditorialStageMediaSlot['aspectRatios'],
  cropModes: EditorialStageMediaSlot['cropModes'],
): EditorialStageMediaSlot => ({ id, purpose, required, aspectRatios, cropModes });

export const coverLayout: EditorialStageLayout = {
  id: 'cover',
  label: 'Cover',
  role: 'title-scene',
  defaultMood: 'hero-dark',
  defaultDensity: 'calm',
  motion: 'hero',
  slots: [
    slot('kicker', 'kicker', true, 48),
    slot('title', 'title', true, 96),
    slot('subtitle', 'subtitle', true, 180),
    slot('meta', 'footer', false, 80),
  ],
  mediaSlots: [mediaSlot('brand_mark', 'Optional logo or brand mark', false, ['1:1'], ['contain'])],
  template: `<section class="es-slide es-cover es-mood-{{mood}}" data-layout="cover">
  <div class="es-chrome" data-slot="kicker">{{kicker}}</div>
  <div class="es-cover-lockup">
    <h1 data-slot="title">{{title}}</h1>
    <p data-slot="subtitle">{{subtitle}}</p>
  </div>
  <footer data-slot="meta">{{meta}}</footer>
</section>`,
};

export const sectionDividerLayout: EditorialStageLayout = {
  id: 'section-divider',
  label: 'Section Divider',
  role: 'transition',
  defaultMood: 'dark',
  defaultDensity: 'calm',
  motion: 'hero',
  slots: [
    slot('section_number', 'label', true, 20),
    slot('title', 'title', true, 72),
    slot('bridge', 'subtitle', false, 150),
    slot('footer', 'footer', false, 80),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-divider es-mood-{{mood}}" data-layout="section-divider">
  <p class="es-section-number" data-slot="section_number">{{section_number}}</p>
  <h2 data-slot="title">{{title}}</h2>
  <p data-slot="bridge">{{bridge}}</p>
  <footer data-slot="footer">{{footer}}</footer>
</section>`,
};

export const bigNumberLayout: EditorialStageLayout = {
  id: 'big-number',
  label: 'Big Number',
  role: 'proof',
  defaultMood: 'light',
  defaultDensity: 'balanced',
  motion: 'cascade',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 86),
    slot('metric_value', 'metric-value', true, 18),
    slot('metric_label', 'metric-label', true, 110),
    slot('interpretation', 'paragraph', true, 220),
    slot('source', 'footer', false, 120),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-big-number es-mood-{{mood}}" data-layout="big-number">
  <header><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2></header>
  <div class="es-number-block"><strong data-slot="metric_value">{{metric_value}}</strong><span data-slot="metric_label">{{metric_label}}</span></div>
  <p class="es-interpretation" data-slot="interpretation">{{interpretation}}</p>
  <footer data-slot="source">{{source}}</footer>
</section>`,
};

export const storySplitLayout: EditorialStageLayout = {
  id: 'story-split',
  label: 'Story Split',
  role: 'story',
  defaultMood: 'light',
  defaultDensity: 'balanced',
  motion: 'directional',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 84),
    slot('quote', 'quote', true, 170),
    slot('body', 'paragraph', true, 230),
    slot('caption', 'footer', false, 120),
  ],
  mediaSlots: [mediaSlot('story_media', 'Photo, screenshot, or field evidence', false, ['4:3', '3:2', '16:9'], ['cover-top', 'contain'])],
  template: `<section class="es-slide es-story-split es-mood-{{mood}}" data-layout="story-split">
  <div class="es-story-copy"><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2><blockquote data-slot="quote">{{quote}}</blockquote><p data-slot="body">{{body}}</p></div>
  <figure class="es-media-frame" data-media-slot="story_media"><div class="es-media-placeholder"></div><figcaption data-slot="caption">{{caption}}</figcaption></figure>
</section>`,
};

export const mediaGridLayout: EditorialStageLayout = {
  id: 'media-grid',
  label: 'Media Grid',
  role: 'evidence',
  defaultMood: 'light',
  defaultDensity: 'dense',
  motion: 'cascade',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 80),
    slot('caption_1', 'footer', false, 90),
    slot('caption_2', 'footer', false, 90),
    slot('caption_3', 'footer', false, 90),
    slot('caption_4', 'footer', false, 90),
  ],
  mediaSlots: [
    mediaSlot('media_1', 'Evidence frame 1', true, ['16:9', '4:3', '1:1'], ['cover-top', 'contain']),
    mediaSlot('media_2', 'Evidence frame 2', true, ['16:9', '4:3', '1:1'], ['cover-top', 'contain']),
    mediaSlot('media_3', 'Evidence frame 3', false, ['16:9', '4:3', '1:1'], ['cover-top', 'contain']),
    mediaSlot('media_4', 'Evidence frame 4', false, ['16:9', '4:3', '1:1'], ['cover-top', 'contain']),
  ],
  template: `<section class="es-slide es-media-grid es-mood-{{mood}}" data-layout="media-grid">
  <header><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2></header>
  <div class="es-grid-frames">
    <figure data-media-slot="media_1"><div></div><figcaption data-slot="caption_1">{{caption_1}}</figcaption></figure>
    <figure data-media-slot="media_2"><div></div><figcaption data-slot="caption_2">{{caption_2}}</figcaption></figure>
    <figure data-media-slot="media_3"><div></div><figcaption data-slot="caption_3">{{caption_3}}</figcaption></figure>
    <figure data-media-slot="media_4"><div></div><figcaption data-slot="caption_4">{{caption_4}}</figcaption></figure>
  </div>
</section>`,
};

export const processPipelineLayout: EditorialStageLayout = {
  id: 'process-pipeline',
  label: 'Process Pipeline',
  role: 'mechanism',
  defaultMood: 'dark',
  defaultDensity: 'balanced',
  motion: 'pipeline',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 86),
    slot('step_1_title', 'step-title', true, 42),
    slot('step_1_body', 'step-body', true, 120),
    slot('step_2_title', 'step-title', true, 42),
    slot('step_2_body', 'step-body', true, 120),
    slot('step_3_title', 'step-title', true, 42),
    slot('step_3_body', 'step-body', true, 120),
    slot('takeaway', 'paragraph', false, 150),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-pipeline es-mood-{{mood}}" data-layout="process-pipeline">
  <header><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2></header>
  <ol><li><b data-slot="step_1_title">{{step_1_title}}</b><span data-slot="step_1_body">{{step_1_body}}</span></li><li><b data-slot="step_2_title">{{step_2_title}}</b><span data-slot="step_2_body">{{step_2_body}}</span></li><li><b data-slot="step_3_title">{{step_3_title}}</b><span data-slot="step_3_body">{{step_3_body}}</span></li></ol>
  <p data-slot="takeaway">{{takeaway}}</p>
</section>`,
};

export const questionHeroLayout: EditorialStageLayout = {
  id: 'question-hero',
  label: 'Question Hero',
  role: 'question',
  defaultMood: 'hero-dark',
  defaultDensity: 'calm',
  motion: 'hero',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('question', 'title', true, 110),
    slot('context', 'subtitle', false, 160),
    slot('footer', 'footer', false, 80),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-question es-mood-{{mood}}" data-layout="question-hero">
  <p data-slot="kicker">{{kicker}}</p>
  <h2 data-slot="question">{{question}}</h2>
  <p data-slot="context">{{context}}</p>
  <footer data-slot="footer">{{footer}}</footer>
</section>`,
};

export const bigQuoteLayout: EditorialStageLayout = {
  id: 'big-quote',
  label: 'Big Quote',
  role: 'quote',
  defaultMood: 'hero-light',
  defaultDensity: 'calm',
  motion: 'quote',
  slots: [
    slot('quote', 'quote', true, 190),
    slot('attribution', 'label', false, 90),
    slot('source', 'footer', false, 110),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-big-quote es-mood-{{mood}}" data-layout="big-quote">
  <blockquote data-slot="quote">{{quote}}</blockquote>
  <p data-slot="attribution">{{attribution}}</p>
  <footer data-slot="source">{{source}}</footer>
</section>`,
};

export const comparisonLayout: EditorialStageLayout = {
  id: 'comparison',
  label: 'Comparison',
  role: 'comparison',
  defaultMood: 'light',
  defaultDensity: 'balanced',
  motion: 'directional',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 82),
    slot('left_label', 'label', true, 32),
    slot('left_body', 'paragraph', true, 190),
    slot('right_label', 'label', true, 32),
    slot('right_body', 'paragraph', true, 190),
    slot('verdict', 'paragraph', true, 160),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-comparison es-mood-{{mood}}" data-layout="comparison">
  <header><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2></header>
  <div class="es-compare-lanes"><article><h3 data-slot="left_label">{{left_label}}</h3><p data-slot="left_body">{{left_body}}</p></article><article><h3 data-slot="right_label">{{right_label}}</h3><p data-slot="right_body">{{right_body}}</p></article></div>
  <p class="es-verdict" data-slot="verdict">{{verdict}}</p>
</section>`,
};

export const leadMediaLayout: EditorialStageLayout = {
  id: 'lead-media',
  label: 'Lead Media',
  role: 'explainer',
  defaultMood: 'light',
  defaultDensity: 'balanced',
  motion: 'directional',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 82),
    slot('body', 'paragraph', true, 240),
    slot('caption', 'footer', false, 130),
  ],
  mediaSlots: [mediaSlot('lead_media', 'Dominant screenshot, diagram, or scene', true, ['16:9', '16:10', '4:3'], ['contain', 'cover-top'])],
  template: `<section class="es-slide es-lead-media es-mood-{{mood}}" data-layout="lead-media">
  <figure data-media-slot="lead_media"><div class="es-media-placeholder"></div><figcaption data-slot="caption">{{caption}}</figcaption></figure>
  <aside><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2><p data-slot="body">{{body}}</p></aside>
</section>`,
};

export const decisionLayout: EditorialStageLayout = {
  id: 'decision',
  label: 'Decision',
  role: 'decision',
  defaultMood: 'light',
  defaultDensity: 'balanced',
  motion: 'cascade',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 82),
    slot('recommendation', 'paragraph', true, 190),
    slot('risk', 'paragraph', true, 150),
    slot('tradeoff', 'paragraph', true, 150),
    slot('ask', 'paragraph', true, 150),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-decision es-mood-{{mood}}" data-layout="decision">
  <header><p data-slot="kicker">{{kicker}}</p><h2 data-slot="title">{{title}}</h2></header>
  <main><p data-slot="recommendation">{{recommendation}}</p><dl><dt>Risk</dt><dd data-slot="risk">{{risk}}</dd><dt>Trade-off</dt><dd data-slot="tradeoff">{{tradeoff}}</dd><dt>Ask</dt><dd data-slot="ask">{{ask}}</dd></dl></main>
</section>`,
};

export const closingActionLayout: EditorialStageLayout = {
  id: 'closing-action',
  label: 'Closing Action',
  role: 'closing-action',
  defaultMood: 'hero-dark',
  defaultDensity: 'calm',
  motion: 'cascade',
  slots: [
    slot('kicker', 'kicker', true, 42),
    slot('title', 'title', true, 86),
    slot('action_1', 'step-body', true, 120),
    slot('action_2', 'step-body', true, 120),
    slot('action_3', 'step-body', true, 120),
    slot('footer', 'footer', false, 90),
  ],
  mediaSlots: [],
  template: `<section class="es-slide es-closing es-mood-{{mood}}" data-layout="closing-action">
  <p data-slot="kicker">{{kicker}}</p>
  <h2 data-slot="title">{{title}}</h2>
  <ol><li data-slot="action_1">{{action_1}}</li><li data-slot="action_2">{{action_2}}</li><li data-slot="action_3">{{action_3}}</li></ol>
  <footer data-slot="footer">{{footer}}</footer>
</section>`,
};

export const EDITORIAL_STAGE_LAYOUTS = [
  coverLayout,
  sectionDividerLayout,
  bigNumberLayout,
  storySplitLayout,
  mediaGridLayout,
  processPipelineLayout,
  questionHeroLayout,
  bigQuoteLayout,
  comparisonLayout,
  leadMediaLayout,
  decisionLayout,
  closingActionLayout,
] as const satisfies readonly EditorialStageLayout[];

export const EDITORIAL_STAGE_LAYOUT_BY_ID = Object.fromEntries(
  EDITORIAL_STAGE_LAYOUTS.map((layout) => [layout.id, layout]),
) as Record<EditorialStageLayoutId, EditorialStageLayout>;
