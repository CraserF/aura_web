# Dyad Teardown

Date: 2026-04-24

Reference: [dyad-sh/dyad](https://github.com/dyad-sh/dyad)

Dyad matters most in this study because its outputs aim at a simpler end-user outcome than developer coding agents: take a plain-language prompt and produce something polished enough to feel intentionally designed.

## What Dyad Suggests

1. Strong defaults beat flexible but weak defaults
   Dyad positions itself as local, fast, and controlled. That framing matters because users trust it to produce something concrete quickly, not to negotiate a complicated toolchain first.

2. Beautiful output needs a strong design prior
   Dyad's appeal is not just “AI app builder.” It is “AI app builder that usually starts from a clearer visual system than raw code generation.” Aura needs a similar design prior for decks and docs.

3. The generator should not be asked to invent everything at once
   Dyad likely benefits from a narrower generation target: apps and sites with a clearer design-system frame. Aura should stop treating every slide/document request as blank-slate HTML invention and instead anchor generation to stronger recipe, template, and edit-family choices first.

4. Local-model support needs intentional fallback behavior
   Dyad's local framing reinforces the same lesson we are already seeing in Ollama work: when the provider is weaker, quality comes from tighter constraints, smaller steps, and better defaults, not from hoping the same long prompt still works.

## Adaptation For Aura

- Presentations should feel like curated slide systems, not raw “generate a page” exercises.
- Documents should feel like editorial or briefing layouts, not styled markdown dumps.
- Spreadsheet quality should come from confident routing and deterministic execution, not visual invention.

## Immediate Product Implications

1. Add an artifact workflow planner before generation.
2. Add queueing for multi-slide work so large requests become visible, staged work.
3. Strengthen template/exemplar guidance, especially for presentations.
4. Split edit families more clearly:
   - content edit
   - style/theme edit
   - structural rewrite
   - full rewrite
5. Tune local-model prompts with stricter, smaller design constraints.
