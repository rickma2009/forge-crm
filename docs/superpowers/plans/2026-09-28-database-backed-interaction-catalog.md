# Database-backed Interaction Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local interaction-index page with a database-backed, two-level tree/list catalog and an in-place detail workspace at `/showcase/style-scenes`.

**Architecture:** Extend the existing `style_scene` aggregate instead of introducing another master table. Import the methodology registry into PostgreSQL through an idempotent seed adapter, expose separately validated taxonomy/list/detail reads, and render those reads through the existing enterprise query, tree-workspace, table, and detail-header primitives.

**Tech Stack:** PostgreSQL, Prisma 7, NestJS, Zod contracts, React 19, Vitest/Testing Library, Jest.

**Spec:** `.specify/specs/026-database-backed-interaction-catalog/spec.md`

## Global Constraints

- Runtime catalog data must come only from `style_scene`; frontend JSON may remain only as a generated validation artifact.
- Preserve all historical `style_scene` records and primary keys; new asset fields are nullable.
- Database table and column names must be lowercase and no longer than 32 characters.
- `category` is the asset type and `sub_category` is its group; `status` and `maturity` remain separate concepts.
- `/showcase/style-scenes` requires login and system navigation access but no page-level authorization assertion.
- The new page is read-only: no create, edit, or delete controls.
- `/showcase/interaction-index` remains only as a compatibility redirect to the formal route.
- Use `RecordQueryBar`, `TreeWorkspace`, `DetailHeader`, and `DetailBackButton`; detail replaces the directory and is not a dialog or drawer.
- Preserve unrelated dirty-worktree changes; every commit stages only files owned by its task.

## Review Focus

- A historical row with `asset_code = NULL` and every JSON field NULL remains listable and its detail renders placeholders rather than failing (Tasks 3 and 5 tests).
- Malformed legacy JSON must produce a diagnosed service response instead of leaking a Prisma/Zod stack or silently using local data (Tasks 1 and 3 tests).
- Rapid tree/filter/page changes must ignore an older response that resolves later (Task 5 test).
- A type with ungrouped records must remain selectable without generating a fake second-level node (Tasks 3 and 5 tests).
- Viewer access must call navigation once, skip page authorization, and never fall back to the bundled interaction JSON when the API fails (Task 6 tests).

---

### Task 1: Persistence and Read Contracts

**Files:**
- Create: `packages/server/prisma/migrations/20260928090000_style_scene_asset_catalog/migration.sql`
- Modify: `packages/server/prisma/schema.prisma`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/style-scene.test.ts`

**Interfaces:**
- Consumes: Existing `SceneStatus`, `styleSceneWriteSchema`, and historical `StyleScene` fields.
- Produces: `interactionMaturitySchema`, `styleSceneSummarySchema`, `styleSceneDetailSchema`, `styleSceneTaxonomySchema`, `styleSceneListSchema`, and their inferred types.

- [ ] **Step 1: Write failing contract tests**

Add tests named `parses a summary without detail json`, `parses a complete catalog detail`, `parses taxonomy with an ungrouped type`, and `rejects malformed evidence cards`. Assert the exact nullable asset fields and that unknown properties are rejected.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `pnpm --filter @forge-crm/contracts test -- style-scene.test.ts`

Expected: FAIL because the catalog schemas are not exported.

- [ ] **Step 3: Define the read schemas and inferred types**

In `packages/contracts/src/index.ts`, add exact schemas for:

- `InteractionMaturity = 'idea' | 'candidate' | 'implementation-verified' | 'interaction-verified' | 'project-adopted' | 'business-validated' | 'released' | 'deprecated'`
- summary fields: existing scene summary plus `assetCode: string | null` and `maturity: InteractionMaturity | null`
- detail fields: summary plus `definition: string[]`, `definitionRef: { path: string; section: string } | null`, `artifacts: string[]`, `evidence: string[]`, `evidenceCards: InteractionEvidenceCard[]`, `nextEvidence: string | null`
- taxonomy fields: `{ types: Array<{ category: string; count: number; groups: Array<{ subCategory: string; count: number }> }> }`

Keep write schemas backward compatible.

- [ ] **Step 4: Add the nullable Prisma columns and unique index**

Add `assetCode`, `maturity`, `definitionJson`, `definitionRefJson`, `artifactsJson`, `evidenceJson`, `evidenceCardsJson`, and `nextEvidence` to `StyleScene`; remove its deprecation comment. Add the mapped unique index `style_scene_asset_uk` over `(system_code, asset_code)`. The migration must use `IF NOT EXISTS`-safe DDL where PostgreSQL supports it and must not update or delete historical rows.

- [ ] **Step 5: Run focused verification**

Run: `pnpm --filter @forge-crm/contracts test -- style-scene.test.ts && pnpm --filter @forge-crm/server prisma:generate && pnpm --filter @forge-crm/server typecheck`

Expected: all commands PASS.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add packages/server/prisma/schema.prisma packages/server/prisma/migrations/20260928090000_style_scene_asset_catalog/migration.sql packages/contracts/src/index.ts packages/contracts/src/style-scene.test.ts
git commit -m "feat: add interaction catalog persistence contracts"
```

### Task 2: Registry Import and Idempotent Seed

**Files:**
- Create: `packages/server/src/style-scene/style-scene.seed.ts`
- Create: `packages/server/src/style-scene/style-scene.seed.spec.ts`
- Modify: `packages/server/prisma/seed.ts`

**Interfaces:**
- Consumes: `_methodology/patterns/index.json` and Task 1 Prisma fields.
- Produces: `loadInteractionCatalog(rootDir: string): InteractionCatalogSeed[]` and `seedInteractionCatalog(database, systemCode, rootDir): Promise<number>`.

- [ ] **Step 1: Write failing seed-adapter tests**

Test that the real registry yields exactly 103 validated rows, maps `kind/group/name/definition` to the approved columns, preserves all structured fields, rejects a duplicate `assetId`, and rejects an `assetId` longer than 32 characters.

- [ ] **Step 2: Run the seed tests and verify failure**

Run: `pnpm --filter @forge-crm/server test -- style-scene.seed.spec.ts`

Expected: FAIL because the seed adapter does not exist.

- [ ] **Step 3: Implement the registry loader**

Implement `loadInteractionCatalog(rootDir)` with `node:fs`, `node:path`, and a strict Zod source schema. Return database-ready values without importing web projection files.

- [ ] **Step 4: Implement idempotent upsert**

Implement `seedInteractionCatalog(...)` using `(systemCode, assetCode)` as the lookup. Update registry-owned fields without changing IDs; never touch rows whose `assetCode` is NULL and never delete absent rows.

- [ ] **Step 5: Replace the legacy inline scene seed**

Remove only the hard-coded `sceneSeeds` block in `packages/server/prisma/seed.ts` and call `seedInteractionCatalog(database, 'demo-portal', projectRoot)`. Resolve `projectRoot` from `import.meta.url`, not the process working directory.

- [ ] **Step 6: Run focused verification**

Run: `pnpm --filter @forge-crm/server test -- style-scene.seed.spec.ts && pnpm --filter @forge-crm/server typecheck`

Expected: PASS, including the exact 103-row assertion.

- [ ] **Step 7: Commit only Task 2 files**

```bash
git add packages/server/src/style-scene/style-scene.seed.ts packages/server/src/style-scene/style-scene.seed.spec.ts packages/server/prisma/seed.ts
git commit -m "feat: seed interaction catalog from methodology registry"
```

### Task 3: Taxonomy, Summary List, and Detail APIs

**Files:**
- Create: `packages/server/src/style-scene/style-scene.service.spec.ts`
- Modify: `packages/server/src/style-scene/style-scene.service.ts`
- Modify: `packages/server/src/style-scene/style-scene.controller.ts`

**Interfaces:**
- Consumes: Task 1 contracts and Prisma columns.
- Produces: `taxonomy(systemCode: string)`, `list(systemCode: string, raw: Record<string, unknown>)`, and `detail(systemCode: string, id: string)` service methods plus GET routes `/taxonomy` and `/:id`.

- [ ] **Step 1: Write failing service tests**

Cover taxonomy counts independent of pagination, type/group filters, maturity/status combination, keyword matching across `assetCode/sceneName/description`, stable summary sort, an ungrouped type, cross-system detail returning 404, a historical NULL-detail row returning empty arrays, and malformed non-null JSON returning `DATA_INVALID` without the raw database error.

- [ ] **Step 2: Run the service tests and verify failure**

Run: `pnpm --filter @forge-crm/server test -- style-scene.service.spec.ts`

Expected: FAIL because taxonomy/detail and the new filters do not exist.

- [ ] **Step 3: Extend query parsing and summary serialization**

Add optional `subCategory` and `maturity` query parameters. Select only summary columns in list queries and order by `sortNo`, `assetCode`, then `createdAt`.

- [ ] **Step 4: Implement taxonomy aggregation**

Implement `taxonomy(systemCode)` from database group/count rows, returning type nodes sorted by their first scene order then category, with groups sorted by first scene order then subcategory. NULL groups contribute to the type count but do not create child nodes.

- [ ] **Step 5: Implement detail validation and diagnosed errors**

Implement `detail(systemCode, id)` using a system-scoped query. Normalize NULL JSON to empty values, parse non-null JSON with Task 1 schemas, throw 404 for a missing scoped row, and translate invalid structured data to an `ApiException('DATA_INVALID', 500, ...)` without returning the raw payload.

- [ ] **Step 6: Add authenticated controller routes**

Add `GET taxonomy` before `GET :id` and `GET :id`; both call `authorization.navigation` and never call `assertAction` or page authorization.

- [ ] **Step 7: Run focused verification**

Run: `pnpm --filter @forge-crm/server test -- style-scene.service.spec.ts && pnpm --filter @forge-crm/server typecheck`

Expected: PASS.

- [ ] **Step 8: Commit only Task 3 files**

```bash
git add packages/server/src/style-scene/style-scene.service.ts packages/server/src/style-scene/style-scene.controller.ts packages/server/src/style-scene/style-scene.service.spec.ts
git commit -m "feat: expose interaction catalog read APIs"
```

### Task 4: Typed Web Gateway

**Files:**
- Modify: `packages/web/src/showcase/gateway.ts`
- Create: `packages/web/src/showcase/gateway.test.ts`

**Interfaces:**
- Consumes: Task 1 contracts and Task 3 routes.
- Produces: `styleSceneTaxonomy(systemCode)`, `styleScenes(systemCode, query)`, and `styleSceneDetail(systemCode, id)` on `EnterpriseGateway`.

- [ ] **Step 1: Write failing gateway tests**

Assert the exact taxonomy, filtered list, and encoded detail URLs; assert that malformed server payloads are rejected by the corresponding Zod schema.

- [ ] **Step 2: Run the gateway tests and verify failure**

Run: `pnpm --filter @forge-crm/web test -- gateway.test.ts`

Expected: FAIL because taxonomy and detail methods do not exist.

- [ ] **Step 3: Add gateway types and implementations**

Import the new schemas/types, add the two new methods to `EnterpriseGateway`, and parse every response. Retain POST/PATCH methods for backward compatibility even though the new page does not call them.

- [ ] **Step 4: Run focused verification**

Run: `pnpm --filter @forge-crm/web test -- gateway.test.ts && pnpm --filter @forge-crm/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit only Task 4 files**

```bash
git add packages/web/src/showcase/gateway.ts packages/web/src/showcase/gateway.test.ts
git commit -m "feat: add interaction catalog gateway reads"
```

### Task 5: Tree/List Directory and In-place Detail Workspace

**Files:**
- Modify: `packages/web/src/showcase/InteractionIndexPage.tsx`
- Modify: `packages/web/src/showcase/InteractionIndexPage.test.tsx`
- Modify: `packages/web/src/showcase/interaction-index.css`
- Delete: `packages/web/src/showcase/data/interaction-index-data.ts`
- Preserve: `packages/web/src/showcase/data/interaction-index.data.json` as a generated validation projection that runtime code must not import

**Interfaces:**
- Consumes: `systemCode`, `gateway`, Task 4 read methods, `RecordQueryBar`, `TreeWorkspace`, `DetailHeader`, and `DetailBackButton`.
- Produces: `InteractionIndexPage({ systemCode, gateway }: { systemCode: string; gateway: EnterpriseGateway })` with internal directory/detail state.

- [ ] **Step 1: Replace the old component tests with failing catalog tests**

Test: two-level taxonomy and counts; type/group selection; query and reset; an ungrouped type; summary columns; code opens detail; detail has no `role=dialog`; standard return restores keyword, selected node, and page; NULL historical details show placeholders; list/detail errors offer retry; an older delayed list response is ignored; API failure never renders a known local asset.

- [ ] **Step 2: Run the component tests and verify failure**

Run: `pnpm --filter @forge-crm/web test -- InteractionIndexPage.test.tsx`

Expected: FAIL because the page still reads local JSON and opens a drawer.

- [ ] **Step 3: Implement directory state and reads**

Change the component signature to accept `systemCode` and `gateway`. Build namespaced nodes `type:<category>` and `group:<category>:<subCategory>`, use `RecordQueryBar` for keyword/type/group/maturity, use `TreeWorkspace` for classification, and request paged summaries. Guard list responses with an incrementing request token or `AbortController`.

- [ ] **Step 4: Implement the enterprise grid**

Render sequence, asset code, name, type, group, maturity, and status. Asset code is the detail button/link; a NULL code displays `—` but the row still exposes an accessible detail action. Add loading, empty, scoped error/retry, and compact pagination states.

- [ ] **Step 5: Implement the replacing detail state**

On selection, request `styleSceneDetail` and replace the complete directory workspace. Use `DetailHeader` and `DetailBackButton` with label `返回交互案例目录`; render definition, source/artifacts, evidence/cards, and deterministic local demo sections. Return by clearing detail state only, preserving directory state.

- [ ] **Step 6: Retire local runtime data and drawer styles**

Delete the runtime TypeScript adapter and every runtime projection import, but retain the generated JSON file for methodology consistency checks. Remove drawer/dialog CSS and retain only styles needed by the enterprise directory, detail sections, maturity badges, and local demo.

- [ ] **Step 7: Run focused verification**

Run: `pnpm --filter @forge-crm/web test -- InteractionIndexPage.test.tsx && pnpm --filter @forge-crm/web typecheck`

Expected: PASS and no test finds `role=dialog`.

- [ ] **Step 8: Commit only Task 5 files**

```bash
git add packages/web/src/showcase/InteractionIndexPage.tsx packages/web/src/showcase/InteractionIndexPage.test.tsx packages/web/src/showcase/interaction-index.css packages/web/src/showcase/data/interaction-index-data.ts
git commit -m "feat: build database-backed interaction catalog page"
```

### Task 6: Portal Integration and Legacy Page Retirement

**Files:**
- Modify: `packages/web/src/showcase/ShowcaseApp.tsx`
- Modify: `packages/web/src/showcase/ShowcaseApp.test.tsx`
- Modify: `packages/web/src/showcase/EnterprisePages.tsx`
- Modify: `packages/web/src/showcase/EnterprisePages.test.tsx`
- Delete: `packages/web/src/showcase/InteractionIndexShell.tsx`

**Interfaces:**
- Consumes: Task 5 component signature and the existing login-only navigation injection.
- Produces: authenticated portal rendering at `/showcase/style-scenes` with compatibility redirect from `/showcase/interaction-index`.

- [ ] **Step 1: Write failing portal tests**

Update the viewer test so its gateway returns taxonomy/list data, then assert: the menu is present; `navigationCalls` contains only `demo-portal`; `pageChecks` excludes `/showcase/style-scenes`; the catalog renders inside the portal; an API failure shows a retryable error and not local assets; the retired route canonicalizes the hash.

- [ ] **Step 2: Run the portal tests and verify failure**

Run: `pnpm --filter @forge-crm/web test -- ShowcaseApp.test.tsx EnterprisePages.test.tsx`

Expected: FAIL because `PageAdapter` does not pass `systemCode/gateway` and the old list component remains.

- [ ] **Step 3: Wire the catalog into PageAdapter**

Render `<InteractionIndexPage systemCode={systemCode} gateway={gateway as EnterpriseGateway} />`. Preserve `withLoginOnlyInteractionIndex`, `removeRetiredSceneRoute`, and the old-hash replacement behavior.

- [ ] **Step 4: Remove obsolete page implementations**

Delete `StyleSceneListPage`, `StyleSceneModal`, their now-unused imports/constants, and `InteractionIndexShell`. Do not remove POST/PATCH gateway compatibility methods or the methodology registry/source scripts.

- [ ] **Step 5: Run focused verification**

Run: `pnpm --filter @forge-crm/web test -- ShowcaseApp.test.tsx EnterprisePages.test.tsx && pnpm --filter @forge-crm/web typecheck`

Expected: PASS; viewer reaches the page without an authorization assertion.

- [ ] **Step 6: Commit only Task 6 files**

```bash
git add packages/web/src/showcase/ShowcaseApp.tsx packages/web/src/showcase/ShowcaseApp.test.tsx packages/web/src/showcase/EnterprisePages.tsx packages/web/src/showcase/EnterprisePages.test.tsx packages/web/src/showcase/InteractionIndexShell.tsx
git commit -m "refactor: retire legacy interaction index surfaces"
```

### Task 7: Migration, Seed, Full Verification, and Traceability

**Files:**
- Create: `.specify/specs/026-database-backed-interaction-catalog/testcases.md`
- Create: `.specify/specs/026-database-backed-interaction-catalog/traceability.md`
- Create: `.specify/specs/026-database-backed-interaction-catalog/review.md`
- Modify: `.specify/specs/026-database-backed-interaction-catalog/spec.md`

**Interfaces:**
- Consumes: Tasks 1–6 complete implementation.
- Produces: migrated/seeded local database, release evidence, and requirement-to-test traceability.

- [ ] **Step 1: Apply migration and seed to the local development database**

Run: `pnpm db:up && pnpm db:migrate && pnpm db:seed`

Expected: migration succeeds; seed reports no error; repeated `pnpm db:seed` also succeeds without duplicate `(system_code, asset_code)` rows.

- [ ] **Step 2: Verify database facts**

Query the local database through the existing project database tooling and record evidence that `demo-portal` has exactly 103 non-null asset codes, all are unique, and legacy NULL-code rows remain present.

- [ ] **Step 3: Run the full automated suite**

Run: `pnpm validate && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all commands PASS. If an unrelated dirty-worktree failure is discovered, document it separately and keep feature-focused checks green.

- [ ] **Step 4: Run browser QA**

Start the existing development services, log in as `viewer`, open `/showcase/style-scenes`, verify type/group scrolling, query/reset, list columns, detail replacement, local demo reset, standard back behavior, and `/showcase/interaction-index` canonicalization. Confirm no console error, framework error overlay, page-authorization request, or local-data fallback.

- [ ] **Step 5: Write release evidence and update spec status**

Record test cases, AC-026-01 through AC-026-09 traceability, migration/seed evidence, browser observations, and residual risks. Change the spec status only to the gate actually reached by the evidence.

- [ ] **Step 6: Commit only Task 7 documentation**

```bash
git add .specify/specs/026-database-backed-interaction-catalog/spec.md .specify/specs/026-database-backed-interaction-catalog/testcases.md .specify/specs/026-database-backed-interaction-catalog/traceability.md .specify/specs/026-database-backed-interaction-catalog/review.md
git commit -m "docs: verify database-backed interaction catalog"
```
