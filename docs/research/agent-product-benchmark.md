# Agent Product Benchmark

Date: 2026-04-24

This benchmark captures workflow and UX patterns from agent products that are relevant to Aura's visual productivity workflows. The goal is not feature parity with developer tools. The goal is to extract the parts that make them feel fast, reliable, and high-signal, then adapt those patterns to documents, presentations, and spreadsheets for less technical users.

## Sources

- [charmbracelet/crush](https://github.com/charmbracelet/crush)
- [ultraworkers/claw-code](https://github.com/ultraworkers/claw-code)
- [openai/codex](https://github.com/openai/codex)
- [anomalyco/opencode](https://github.com/anomalyco/opencode)
- [wshobson/agents](https://github.com/wshobson/agents)

## Comparison Matrix

| Product | Strong UX Pattern | Relevant Aura Takeaway | Do Not Copy |
| --- | --- | --- | --- |
| Crush | Strong local/project configuration, skills, permissions, and session continuity | Give Aura stronger artifact-scoped defaults, reusable guidance packs, and clear queue state without making the user configure everything manually | Developer-heavy config surfaces, tool permissions, and MCP complexity |
| Claw Code | Clear usage docs, doctor-first onboarding, parity/status docs, and explicit roadmap framing | Treat workflow health and validation debt as visible product state; keep the docs honest when something is implemented but still unstable | Rust-port/parity concerns and developer-only harness details |
| Codex | Distinct local/app/editor entrypoints and a lightweight “runs locally” mental model | Keep Aura's entrypoint simple, keep progress obvious, and make the create/edit mode feel local and direct rather than opaque | Developer environment assumptions and code-first task framing |
| OpenCode | Explicit `build` vs `plan` agent split, provider flexibility, and client/server separation | Separate planning from generation in Aura, and keep the planner lightweight and explicit before expensive design steps | Developer TUI complexity and remote/client-server surface area |
| wshobson/agents | Progressive disclosure, single-purpose plugin bundles, and formal evaluation framework | Break Aura guidance into smaller intent-aware packs; evaluate quality in families instead of relying on one huge prompt | Massive plugin marketplaces or agent taxonomies visible to lay users |

## Shared Patterns Worth Adapting

1. Strong defaults with low-friction onboarding
   Aura should infer create/edit/restyle/rewrite/queue from plain English rather than asking the user to route themselves.

2. Explicit planning before execution
   OpenCode and the broader agent ecosystem keep analysis separate from execution. Aura should do the same for artifact workflows, especially presentations.

3. Progressive guidance instead of one giant prompt
   Crush and the plugin/skills ecosystem point toward smaller guidance modules loaded when needed. Aura should use intent-aware prompt packs and exemplar sets instead of a monolithic prompt.

4. Better progress and inspectability
   These tools feel responsive because they make sessions, phases, and permissions visible. Aura should make queue items, current step, and next step visible during long design runs.

5. Honest quality evaluation
   The best open agent ecosystems are explicit about parity gaps, health checks, and scoring. Aura should keep using benchmark cases and scorecards rather than subjective “looks okay” reviews.

## Aura-Specific Decisions

- Favor simpler user-facing UX than any of these products.
- Keep the complexity internal: workflow planning, queueing, prompt packs, validation, and provider-aware fallbacks.
- Use these products as workflow references, not design references. Dyad is the better visual-quality reference.
