# Editorial Stage Visual Gate Review

Date: 2026-05-01

Scope: read-only screenshot review for Phase 5. This review covers the generated 1280x720 PNGs in `/private/tmp/editorial-stage-visual-gate` and records concrete visual findings only. No runtime source or tests were changed for this pass.

## Reviewed Evidence

Screenshot set present:

- `editorial-magazine-slide-01.png` through `editorial-magazine-slide-08.png`
- `editorial-magazine-slide-02-fresh.png`
- `modern-minimal-slide-01.png` through `modern-minimal-slide-08.png`
- `data-utility-slide-01.png` through `data-utility-slide-08.png`

All reviewed PNGs are 1280x720. The extra `editorial-magazine-slide-02-fresh.png` matches the baseline slide 02 rerender visually and does not change the gate outcome.

Representative slides inspected at full size:

- Covers: slide 01 across all three variants.
- Context/section slide: slide 02, including the targeted fresh rerender.
- Metric/proof slide: slide 03 across all three variants.
- Decision/interstitial slide: slide 04 across all three variants.
- Lead-media evidence slide: slide 05 across all three variants.
- Comparison slide: slide 06 across all three variants.
- Process/pipeline slide: slide 07 across all three variants.
- Closing/next slide: slide 08 across all three variants.

## Gate Status

Status: **Fail**.

The deck is not blocked by blank slides or unreadable baseline typography, and the three directions are visually distinguishable beyond color. However, the screenshot set shows repeatable fixed-stage/cropping problems that violate the Phase 5 manual gate requirements for no overflow and a credible 1280x720 stage.

## Passing Observations

- No reviewed slide is blank.
- All reviewed files report as 1280x720 PNGs.
- Direction differences are visible:
  - `editorial-magazine` uses serif display type, warmer paper backgrounds, and red/rust accents.
  - `modern-minimal` uses sans-serif type, cooler neutral surfaces, and brighter blue accents.
  - `data-utility` uses a denser blue/green operational palette.
- Slide 05 no longer shows an empty optional-media placeholder. The evidence frame reads as an intentional bound/placeholder evidence graphic rather than a missing image box.
- The main body copy is readable on the reviewed light and dark slides.

## Blocking Findings

1. **The rendered stage leaves a persistent white band at the bottom.**

   Almost every screenshot shows the designed slide surface ending above the bottom of the 1280x720 capture, leaving a white strip across the full width. This is especially obvious on dark slides such as `editorial-magazine-slide-01.png`, `modern-minimal-slide-01.png`, `data-utility-slide-01.png`, slide 07, and slide 08. The gate expected a fixed 1280x720 stage; visually, the slide appears shorter than the capture.

2. **Bottom content is clipped or hidden behind that band.**

   The issue is not just cosmetic whitespace. Several slides place meaningful content at the lower edge and it is cut off:

   - `editorial-magazine-slide-03.png`, `modern-minimal-slide-03.png`, and `data-utility-slide-03.png`: the bottom proof/summary sentence is partially visible at the lower edge and appears clipped.
   - `editorial-magazine-slide-06.png`, `modern-minimal-slide-06.png`, and `data-utility-slide-06.png`: the comparison verdict line sits at the bottom boundary; in the editorial and minimal variants it is visibly cropped.
   - `editorial-magazine-slide-07.png`, `modern-minimal-slide-07.png`, and `data-utility-slide-07.png`: the lower portion of the process cards approaches or intersects the white band, making the composition feel clipped.
   - `editorial-magazine-slide-08.png`, `modern-minimal-slide-08.png`, and `data-utility-slide-08.png`: the bottom of the closing action cards is cut off by the capture boundary/white band.

3. **The bottom rule/caption rhythm creates accidental footer collisions.**

   Slides 03 and 06 use bottom summary text with a long horizontal rule. In the screenshots the rule and text sit too close to the stage boundary, so even where the sentence is technically legible, it reads as an accidental browser/footer collision rather than intentional slide composition.

4. **Slide 07 and slide 08 still read too much like equal-panel card walls.**

   The process and closing slides are more polished than the original generic template, but their lower halves are still dominated by three equal rectangular panels. Because those panels are also affected by bottom clipping, they fail the manual gate's "no card wall" and "no overflow" checks in combination.

## Recommended Big Fixes

1. **Fix the stage/capture height contract first.**

   Confirm whether the compiled slide root, screenshot harness viewport, or export wrapper is producing a slide surface shorter than 720px. The white band should disappear before judging finer layout craft.

2. **Add a render-gate assertion for full-stage background coverage.**

   Automated smoke coverage should catch a slide root that does not paint the full 1280x720 canvas, especially for dark-background slides where the defect is obvious.

3. **Give bottom summary/verdict content a protected safe area.**

   Move the metric proof sentence and comparison verdict away from the bottom edge, or reserve a footer region inside the slide surface so captions never depend on the final pixels of the viewport.

4. **Rework process and closing slides after the crop fix.**

   Once the stage height is correct, revisit slides 07 and 08 so at least one of them breaks the three-equal-card rhythm with stronger hierarchy, staggered sizing, a timeline spine, or a more editorial next-step composition.

## Phase 5 Disposition

The screenshot review is now converted into specific logged fixes. Phase 5 should remain Active until the blocking stage/cropping issues are fixed and a fresh screenshot set confirms:

- no persistent white band;
- no clipped bottom text or cards;
- no footer collisions on slides 03 and 06;
- process/closing layouts no longer read as cropped equal-panel card walls.

