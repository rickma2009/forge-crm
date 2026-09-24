# Master-Detail Document Assets Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the existing sales-order prototype into reusable, traceable enterprise UI assets, then prove the same contracts with a BOM scenario without connecting production services.

**Architecture:** Keep `_methodology/patterns/index.json` as the only method-asset registry and project it into the Lab through validation references. Inside the React app, use five one-way layers—foundation, primitive adapters, controlled enterprise components, master-detail template, and scenario adapters—with pure reducers and deterministic in-memory outcomes.

**Tech Stack:** pnpm 9, Turbo 2, TypeScript 5.7, React 19, Vite 5, Vitest 3, Testing Library, Tabler Icons, CSS Variables; no new runtime dependency.

> Status: candidate execution aid. It is not the authoritative Spec and must not be executed until slice 010 `plan.md` and `ADR-005` pass Architecture Gate. After approval, create the authoritative `.specify/.../tasks.md` from this plan before editing implementation files.

---

### Task 1: Activate the approved architecture and lock the baseline

**Files:**
- Create: `.specify/specs/010-master-detail-document-assets/tasks.md`
- Modify: `.specify/specs/010-master-detail-document-assets/pipeline-state.json`
- Test: existing workspace checks

- [ ] Record the Architecture Gate source and translate the approved plan into traceable `TASK-1001+` items; do not widen scope.
- [ ] Run `pnpm verify` from `interaction-pattern-lab` and save the exact pre-change result in the slice evidence draft.
- [ ] Run `bash _methodology/scripts/verify-all.sh` from the workbench root.
- [ ] If either baseline fails, diagnose and record the pre-existing failure before feature work; do not label it as slice success.
- [ ] Commit only the Gate/task state: `git add interaction-pattern-lab/.specify && git commit -m "docs: activate slice 010 architecture"`.

### Task 2: Add traceability contracts before changing UI

**Files:**
- Modify: `packages/web/src/showcase/registry/types.ts`
- Modify: `packages/web/src/showcase/registry/showcase-registry.data.json`
- Modify: `scripts/showcase-registry-validation.mjs`
- Modify: `packages/web/src/showcase/registry/registry.test.ts`
- Modify: `packages/web/src/showcase/OverviewPage.tsx`

- [ ] Add failing tests asserting `template-form`, `template-workbench`, and `template-master-detail` expose direct REQSRC, extraction, EPM, implementation and QA status references.
- [ ] Add failing tests for an unknown EPM ID, a missing referenced path, an orphan page, and separate interactive/description counts.
- [ ] Run `pnpm --filter @interaction-pattern-lab/web test -- registry.test.ts` and confirm the new tests fail for the intended reason.
- [ ] Introduce a typed `traceability` object and validation that resolves paths relative to the project root; represent absent QA as `qaStatus: 'not-run'`, never as a fabricated file.
- [ ] Update the three page records with `REQSRC-029/030`, `UID-001`, and approved EPM references; update Overview to derive counts from Registry data.
- [ ] Re-run the focused test and `pnpm validate:showcase`; confirm both pass.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/showcase interaction-pattern-lab/scripts && git commit -m "feat: add showcase asset traceability"`.

### Task 3: Establish the minimum foundation layer

**Files:**
- Create: `packages/web/src/ui-assets/foundation/enterprise-tokens.css`
- Create: `packages/web/src/ui-assets/foundation/foundation-manifest.ts`
- Create: `packages/web/src/ui-assets/foundation/FoundationSpecimen.tsx`
- Create: `packages/web/src/ui-assets/foundation/FoundationSpecimen.test.tsx`
- Modify: `packages/web/src/showcase/ShowcaseApp.tsx`

- [ ] Write failing tests that each displayed token has a semantic name, source, consumer and coverage state; assert unimplemented tokens are listed as gaps.
- [ ] Run the focused test and confirm failure.
- [ ] Define only slice-used color, type, density/spacing, focus, icon and state tokens; reuse existing project typography and do not create a second global reset.
- [ ] Render the foundation routes from the manifest, including consumers and uncovered items.
- [ ] Re-run the focused test, typecheck and build.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets/foundation interaction-pattern-lab/packages/web/src/showcase && git commit -m "feat: add minimum enterprise foundation assets"`.

### Task 4: Build and test SchemaForm rules

**Files:**
- Create: `packages/web/src/ui-assets/components/schema-form/types.ts`
- Create: `packages/web/src/ui-assets/components/schema-form/rules.ts`
- Create: `packages/web/src/ui-assets/components/schema-form/rules.test.ts`
- Create: `packages/web/src/ui-assets/primitives/field-adapters.tsx`

- [ ] Write table-driven failing tests for visible, required, readonly and disabled decisions in create/view/edit modes.
- [ ] Add failing cases for hidden-field errors using `reveal` and `clear`, an unknown renderer, and remote-select `{id,label}` hydration failure.
- [ ] Run `pnpm --filter @interaction-pattern-lab/web test -- rules.test.ts` and verify red.
- [ ] Implement pure rule evaluation and discriminated field schemas; return explicit safe errors instead of `undefined` rendering.
- [ ] Implement thin adapters for text, number, date, select and remote-select without network calls.
- [ ] Re-run focused tests and typecheck.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets && git commit -m "feat: define schema form contracts"`.

### Task 5: Render SchemaForm and validation navigation

**Files:**
- Create: `packages/web/src/ui-assets/components/schema-form/SchemaForm.tsx`
- Create: `packages/web/src/ui-assets/components/schema-form/SchemaForm.test.tsx`
- Create: `packages/web/src/ui-assets/components/validation-summary/ValidationSummary.tsx`
- Create: `packages/web/src/ui-assets/components/validation-summary/ValidationSummary.test.tsx`

- [ ] Write failing component tests for grouping, required labels, help, readonly copyability, disabled reason, inline errors and change events.
- [ ] Write a failing keyboard test that activates the first error and moves focus to the correct visible field or reveal control.
- [ ] Run both focused tests and confirm red.
- [ ] Implement controlled rendering and stable `aria-describedby`, `aria-invalid`, alert/summary relationships; keep validation policy outside the view.
- [ ] Re-run tests with `user-event`, then lint and typecheck.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets/components && git commit -m "feat: implement accessible schema form"`.

### Task 6: Build the editable-line reducer

**Files:**
- Create: `packages/web/src/ui-assets/components/editable-line-grid/types.ts`
- Create: `packages/web/src/ui-assets/components/editable-line-grid/reducer.ts`
- Create: `packages/web/src/ui-assets/components/editable-line-grid/reducer.test.ts`

- [ ] Write failing tests for append-empty, append-candidate, copy, update, select, remove-draft, mark-delete and undo-delete.
- [ ] Assert copied/new rows receive deterministic stable IDs; persisted undo restores identical ID, values and index.
- [ ] Add a failing revision-conflict test proving stale undo cannot restore the wrong snapshot.
- [ ] Add integer-minor-unit summary tests and dirty-state transitions.
- [ ] Run the reducer test and verify red.
- [ ] Implement the pure reducer and deterministic ID allocator injected by the scenario.
- [ ] Re-run focused tests and typecheck.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets/components/editable-line-grid && git commit -m "feat: add editable line state model"`.

### Task 7: Render the editable line grid and its failure paths

**Files:**
- Create: `packages/web/src/ui-assets/components/editable-line-grid/EditableLineGrid.tsx`
- Create: `packages/web/src/ui-assets/components/editable-line-grid/EditableLineGrid.test.tsx`
- Create: `packages/web/src/ui-assets/components/async-state/AsyncOutcome.tsx`
- Create: `packages/web/src/ui-assets/components/async-state/AsyncOutcome.test.tsx`

- [ ] Write failing tests for add/select/copy/delete/undo, fixed action access, inline editing, summaries and unsaved marker.
- [ ] Add keyboard tests for row entry, Tab movement, Escape cancellation and error-summary focus.
- [ ] Add outcome tests proving success, validation failure, business rejection and partial success remain distinct; assert counts reconcile.
- [ ] Run focused tests and verify red.
- [ ] Implement a controlled semantic table with stable keys and visible focus; keep candidate lookup and money formatting injected.
- [ ] Implement outcome rendering with no production-like success claim for simulated actions.
- [ ] Re-run focused tests, lint and typecheck.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets/components && git commit -m "feat: implement editable enterprise line grid"`.

### Task 8: Compose the master-detail document controller

**Files:**
- Create: `packages/web/src/ui-assets/templates/master-detail-document/types.ts`
- Create: `packages/web/src/ui-assets/templates/master-detail-document/reducer.ts`
- Create: `packages/web/src/ui-assets/templates/master-detail-document/reducer.test.ts`
- Create: `packages/web/src/ui-assets/templates/master-detail-document/MasterDetailDocument.tsx`
- Create: `packages/web/src/ui-assets/templates/master-detail-document/MasterDetailDocument.test.tsx`

- [ ] Write failing reducer tests for create/view/edit, clean/dirty/saving, duplicate-submit blocking, save outcomes and leave-confirm cancel.
- [ ] Write failing component tests for object header, header form, line grid, summary, related/log entry and bottom action area.
- [ ] Assert successful save feedback and business status transition are separate events.
- [ ] Run focused tests and verify red.
- [ ] Implement the reducer and template using the already-tested components; Adapter calls are the only async seam.
- [ ] Re-run focused tests, lint, typecheck and build.
- [ ] Commit: `git add interaction-pattern-lab/packages/web/src/ui-assets/templates && git commit -m "feat: compose master detail document template"`.

### Task 9: Migrate sales order without a big-bang rewrite

**Files:**
- Create: `packages/web/src/ui-assets/scenarios/sales-order/adapter.ts`
- Create: `packages/web/src/ui-assets/scenarios/sales-order/config.ts`
- Create: `packages/web/src/ui-assets/scenarios/sales-order/SalesOrderScenario.tsx`
- Create: `packages/web/src/ui-assets/scenarios/sales-order/SalesOrderScenario.test.tsx`
- Modify: `packages/web/src/showcase/ShowcaseApp.tsx`
- Preserve until cutover is green: `packages/web/src/showcase/SalesOrderPrototype.tsx`
- Modify: `packages/web/src/showcase/SalesOrderPrototype.test.tsx`

- [ ] Add failing scenario tests for header fields, product candidate append, quantities/prices/tax/delivery, totals, delete undo, draft save and submit.
- [ ] Add failing tests for validation failure, business rejection, partial success, duplicate submit and cancelled leave.
- [ ] Implement deterministic fixtures, IDs and outcomes in the Adapter; do not use `Date.now()`, `fetch` or browser storage.
- [ ] Route `sales-order-prototype` to the new scenario only after the new tests and existing prototype behavior tests pass.
- [ ] Keep the old component for one migration step; delete it only in a later scoped commit after no imports and equivalent tests are proven.
- [ ] Run `pnpm --filter @interaction-pattern-lab/web test`, `pnpm validate:isolation`, typecheck and build.
- [ ] Commit the migration: `git add interaction-pattern-lab/packages/web/src && git commit -m "refactor: migrate sales order to enterprise assets"`.

### Task 10: Prove reuse with the BOM scenario

**Files:**
- Create: `packages/web/src/ui-assets/scenarios/bom/adapter.ts`
- Create: `packages/web/src/ui-assets/scenarios/bom/config.ts`
- Create: `packages/web/src/ui-assets/scenarios/bom/BomScenario.tsx`
- Create: `packages/web/src/ui-assets/scenarios/bom/BomScenario.test.tsx`
- Create: `scripts/validate-ui-asset-boundaries.mjs`
- Modify: `package.json`
- Modify: `packages/web/src/showcase/registry/showcase-registry.data.json`
- Modify: `packages/web/src/showcase/registry/registry.ts`
- Modify: `packages/web/src/showcase/ShowcaseApp.tsx`

- [ ] Write a failing test that mounts BOM through the same MasterDetailDocument API and proves hierarchy, candidate match and difference highlighting come from extensions.
- [ ] Write a failing boundary script that rejects BOM/product-domain terms and scenario imports under core component/template directories.
- [ ] Add a Showcase page/route with direct source and EPM traceability, initially `qaStatus: 'not-run'`.
- [ ] Implement the minimum BOM scenario and extensions; explicitly show the demo depth/row budget.
- [ ] Run the scenario test and boundary validator, then the complete Web suite.
- [ ] Commit: `git add interaction-pattern-lab && git commit -m "feat: validate enterprise assets with bom scenario"`.

### Task 11: Create candidate methodology assets and deterministic projection

**Files:**
- Create: `_methodology/templates/ui/master-detail-document/README.md`
- Create: `_methodology/templates/ui/master-detail-document/schema-form.schema.example.json`
- Create: `_methodology/templates/ui/master-detail-document/editable-line-grid.schema.example.json`
- Create: `_methodology/templates/ui/master-detail-document/state-matrix.md`
- Create: `_methodology/templates/ui/master-detail-document/acceptance-checklist.md`
- Create: `_methodology/templates/ui/master-detail-document/master-detail-document.tokens.css`
- Modify: `_methodology/scripts/enterprise-interaction-index.mjs`
- Modify: `packages/web/src/catalog/validation-slices.data.json`
- Modify: `src/catalog/patterns.data.json` through the generator only
- Test: `_methodology/scripts/check-enterprise-interaction-index.mjs`, `scripts/validate-pattern-projection.mjs`

- [ ] Add failing checks for `VAL-010`, artifact paths and candidate maturity that does not exceed evidence.
- [ ] Author stack-neutral contracts, applicability/non-applicability, failure behavior, adoption steps and acceptance checklist; cite sources and distinguish facts, inference and approved decisions.
- [ ] Register candidate artifacts without calling them best practice or marking real-project validation.
- [ ] Generate the Lab projection with `pnpm generate:patterns`; never hand-edit generated JSON.
- [ ] Run method index and Lab projection checks.
- [ ] Commit: `git add _methodology interaction-pattern-lab/packages/web/src/catalog && git commit -m "docs: add candidate master detail assets"`.

### Task 12: Run browser QA and prepare, but do not approve, Release

**Files:**
- Modify: `.specify/specs/010-master-detail-document-assets/testcases.md`
- Modify: `.specify/specs/010-master-detail-document-assets/traceability.md`
- Create: `.specify/specs/010-master-detail-document-assets/implementation-evidence.md`
- Create: `.specify/specs/010-master-detail-document-assets/review.md`
- Create: `.specify/specs/010-master-detail-document-assets/release-gate-review.md`
- Modify: `packages/web/src/showcase/registry/showcase-registry.data.json`

- [ ] Run focused tests, then `pnpm verify`; record exact command, date and result.
- [ ] Run `bash _methodology/scripts/verify-all.sh`; record the exact result.
- [ ] Start the approved local runtime and execute keyboard/main/error paths at 1440px, 1024px and narrow width; inspect console and network.
- [ ] Record real evidence for each `TC-1001`—`TC-1017`; do not mark unrun checks passed.
- [ ] Replace `qaStatus: 'not-run'` only with paths to evidence that now exists; re-run Registry validation.
- [ ] Summarize confirmed, unconfirmed, reusable, non-reusable, source evidence and current Gate state per workbench rules.
- [ ] Prepare the Release Gate package with an explicit `awaiting-user-approval`; do not mark Release or asset promotion approved.
- [ ] Commit the evidence only after verification: `git add interaction-pattern-lab/.specify interaction-pattern-lab/packages/web/src/showcase/registry && git commit -m "test: document slice 010 verification"`.
