# Backlog Phase A: Standalone Export Artifacts and Aura Media Packaging

This document tracks backlog-first implementation progress for standalone export artifacts, document email export, and image-first Aura media packaging.

## Goal

Add artifact-level standalone export outputs and durable image packaging without merging this work into the canonical Phase 4 targeted-editing track.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/backlog-phase-a-export-and-media.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, export/media scaffolds | None | `validated` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | Pending |
| Stream A: Export Contracts + Standalone HTML | Codex | `src/services/export/*`, artifact export UI, export tests | Bootstrap | `planned` | Pending | Pending |
| Stream B: Email HTML + Sanitization Rules | Codex | `src/services/export/emailHtml.ts`, sanitizer updates, export warnings | Stream A | `planned` | Pending | Pending |
| Stream C: Aura Media Packaging | Codex | `src/types/*`, `src/lib/fileAttachment.ts`, `src/services/storage/projectFormat.ts`, packaging tests | Bootstrap | `planned` | Pending | Pending |
| Stream D: Integration + Validation | Codex | export/menu wiring, regression tests, tracker updates | Streams A+B+C | `planned` | Pending | Pending |

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Validation Log

### Bootstrap

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog phase doc, coordination doc updates, validation command cleanup, and export/media scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Result: Ready to commit
