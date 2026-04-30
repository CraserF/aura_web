# Failure Cases

## presentation.card_wall

The slide has many equal panels with no dominant claim. Repair by choosing one lead statement and moving supporting detail into `big-number`, `decision`, or `lead-media`.

## presentation.generic_motif

The slide relies on circles, blobs, generic gradients, or decorative shapes. Repair with rules, rails, type scale, captions, and real media.

## presentation.fake_metric

A metric appears without source support. Repair by adding a source note, binding evidence, or rewriting as a qualitative statement.

## presentation.weak_hierarchy

Everything has similar scale or contrast. Repair by making one object dominant and cutting secondary copy.

## presentation.no_breaker_rhythm

The deck runs too long without a reset. Insert `section-divider`, `question-hero`, or `big-quote`.

## rhythm.adjacent_repeated_layout

Adjacent slides repeat the same skeleton and create a mechanical rhythm. Repair by switching one slide to a different layout family or inserting a breaker.

## rhythm.hero_breaker_gap

Three or four slides pass without a hero, section divider, question, or quote reset. Repair by inserting `section-divider`, `question-hero`, or `big-quote`, or by changing a content slide into a stronger proof/decision moment.

## rhythm.repeated_card_media_wall_risk

Three consecutive slides use dense, media-grid, comparison, or lead-media structures and begin to feel like repeated cards. Repair by making one slide type-led (`big-number`, `question-hero`, `big-quote`, or `decision`) with a single dominant object.

## presentation.asset_missing_when_required

A layout requires media but no valid asset is bound. Repair by binding an asset, switching to a non-media layout, or using a clearly labelled placeholder.

## media.aspect_invalid

The bound media aspect ratio does not fit the declared slot. Repair by changing the crop/aspect metadata or choosing a layout that fits the asset.

## media.crop_invalid

The bound media crop mode is not allowed for the slot. Product screenshots and diagrams usually need `contain` or `cover-top`.

## presentation.fallback_copy

The source payload still contains generic fallback copy such as "A clearer path forward" or "Frame the point". Repair by replacing it with source-derived language before compiling.

## presentation.chrome_kicker_duplicate

The kicker and footer say the same thing. Repair by making the kicker the slide hook and the footer metadata or source context.

## presentation.title_too_long_for_layout

The title exceeds the skeleton budget. Repair by shortening the title before changing the layout.

## presentation.accent_overuse

The accent becomes the main background or fills too many elements. Repair by returning accent to rules, labels, and one key highlight.
