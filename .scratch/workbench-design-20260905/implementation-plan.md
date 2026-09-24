# Enterprise Workbench Implementation Plan

> **For agentic workers:** Inline execution in the current task; no subagent delegation. This plan is a design-prototype execution aid, not an approved SDD Plan.

**Goal:** Build a reusable, interactive personal workbench and master-detail task workspace inside the validation portal.

**Architecture:** A deterministic React adapter owns prototype state and exposes two variants from the existing page registry. Configuration and interaction semantics remain separate from the portal shell so a future project can replace mock data without copying the demo.

**Tech Stack:** React, TypeScript, Testing Library, Vitest, Tabler Icons, existing Vite/Turbo workspace.

**Spec:** `.scratch/workbench-design-20260905/design-brief.md`

## Global Constraints

- Keep demo data in memory and deterministic.
- Preserve the current registry, RBAC and portal-shell boundaries.
- Use existing visual tokens and Tabler icons.
- Do not claim a Gate, release or method-asset promotion.

### Task 1: Registry contract

**Files:** modify registry JSON/types/validators and their tests.

- [x] Add failing assertions that workbench and master-detail routes use interactive renderers.
- [x] Run `pnpm --filter @interaction-pattern-lab/web test -- registry.test.ts` and observe the renderer assertion fail.
- [x] Register `personal-workbench` and `master-detail-workbench`; rerun the test.

### Task 2: Interaction model and view

**Files:** create `EnterpriseWorkbenchPrototype.tsx`, its CSS and test file; modify `ShowcaseApp.tsx`.

- [x] Add failing portal tests for filter/selection synchronization, completion feedback, reminder deferral and personal-todo creation.
- [x] Run the focused test and confirm the description-only page cannot satisfy the expectations.
- [x] Implement the deterministic adapter and both page variants using the selected visual baseline.
- [x] Rerun focused tests and then the full web suite.

### Task 3: Candidate-method package

**Files:** add validation-project design notes and a methodology reference-case candidate; update reference inventory.

- [x] Record menu-to-archetype mapping, semantic distinctions, applicability, exclusions and acceptance checklist.
- [x] Keep maturity at candidate/validation evidence; do not add a formal pattern or claim project adoption.

### Task 4: Visual and engineering QA

**Files:** update `design-qa.md`; save browser evidence under `.scratch/workbench-design-20260905/`.

- [x] Run lint, typecheck, tests, build and registry validation.
- [x] Capture the source and both rendered variants at 1440×1024.
- [x] Exercise the primary interactions, check console errors and create one combined comparison image.
- [x] Fix all P0/P1/P2 findings and set `final result` to `passed` only with fresh evidence.
