# Editorial Stage V1 Design

## Visual Theme & Atmosphere

Editorial Stage is a magazine issue, not a card wall. It uses type, rules, margins, contrast, captions, and asymmetric composition to create hierarchy. Circular motifs, radial decoration, glass panels, and repeated equal cards are not part of the default language.

## Color Palette & Roles

Use paper, ink, charcoal, warm accent, teal accent, and evidence colors. Backgrounds can alternate between light paper and dark charcoal. Accent color is for signposting, rules, and key labels, not large decorative fills.

## Typography Rules

The compiler assigns type roles. Display type carries covers, questions, section dividers, quotes, and big numbers. Body type stays compact and readable. Mono type is reserved for metadata, section labels, source notes, and numeric labels.

## Component Stylings

Prefer editorial rails, thin rules, caption systems, media frames, comparison lanes, and process connectors. Radius stays at 8px or below. Shadows should be absent or barely visible. A panel is allowed only when it frames a distinct decision, quote, or media item.

## Layout Principles

Every slide needs a dominant object: a headline, number, quote, image, question, or recommendation. Do not distribute attention evenly across six objects. Break the rhythm every 3 to 4 slides with a hero, divider, question, or quote.

## Depth & Elevation

Depth comes from scale, contrast, and alignment. Avoid floating cards, stacked glass, large gradients, and decorative blobs. Media frames should be flat, cropped safely, and captioned.

## Do's and Don'ts

Do use strong editorial skeletons, source-backed proof, large type, quiet metadata, and purposeful whitespace.

Do not use circular motifs, generic icon chips, fake stats, emoji icons, arbitrary user-supplied palettes, or repeated app-card grids.

## Responsive Behavior

The reference stage is fixed 16:9. Text must remain inside its layout budget. Media slots define ratio and crop mode so screenshots and diagrams do not lose important edges.

## Agent Prompt Guide

Select the pack and direction, plan the deck rhythm, fill the JSON source payload, bind assets, and let the compiler render. Never ask the model to invent CSS or raw slide HTML for this pack.
