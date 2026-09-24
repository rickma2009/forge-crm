# Product Workspace, Effective Pricing and Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved product detail workspace, date-effective pricing, safe product deletion and reusable attachments.

**Architecture:** Preserve `md_product` identity and quotation snapshots; evolve pricing with effective date ranges; add a guarded `sys_attachment` module backed by private local storage. React dynamic routes compose product information, pricing and a parameterized attachment panel.

**Tech Stack:** React 19/Vite, NestJS 10, Zod, Prisma 7/PostgreSQL, Vitest/Jest.

**Spec:** `.specify/specs/023-product-workspace-pricing-attachments/spec.md`

## Global Constraints

- Lower snake_case physical identifiers, maximum 32 characters.
- No production code before a failing test.
- Preserve historical quotation price IDs and snapshots.
- Files stay outside public static roots; downloads are authenticated.
- No external deployment or remote push.

## Review Focus

- Date boundaries must use quote `DATE`, not local/UTC instant conversion.
- Concurrent product deletion and new references must not orphan rows.
- Attachment paths must remain inside the configured root after hostile filenames.
- Multipart failure must not leave visible metadata or untracked final files.
- Viewer/direct API calls must remain denied even when UI controls are hidden.

---

### Task 1: Data model, migration and contracts

**Files:** Prisma schema/migration, runtime config, contracts pricing/attachment, migration/config tests.

**Interfaces:** Produces date-effective price and attachment DTO/write schemas consumed by Tasks 2–5.

- [ ] Add failing contract/config/database-definition tests for new fields, filename/path limits and required storage configuration.
- [ ] Run focused tests and confirm failures are caused by missing schemas/fields.
- [ ] Add Prisma models, SQL migration, runtime options and Zod contracts.
- [ ] Run focused tests, Prisma generate and typecheck to GREEN.

### Task 2: Effective-date pricing

**Files:** quotation pricing service/controller/domain/tests and quotation integration tests.

**Interfaces:** Consumes Task 1 price schema; produces `resolveEffectivePrice(productId, quoteDate, quantity, currency)` for quotation and web gateway.

- [ ] Add failing tests for first/last date, no match, overlap, standard/tiered and historical snapshot preservation.
- [ ] Run tests to observe RED.
- [ ] Implement transactional price version save and quote-date resolution; pass quote date through quotation validation.
- [ ] Run pricing and quotation suites to GREEN.

### Task 3: Product detail and safe deletion API

**Files:** opportunity product controller/service/contracts tests, authorization route tests, registry/seed.

**Interfaces:** Produces product detail/delete gateway endpoints and structured `PRODUCT_REFERENCED` response.

- [ ] Add failing tests for detail, version conflict, each reference counter, zero-reference delete and dynamic route authorization.
- [ ] Run tests to observe RED.
- [ ] Implement serializable lock/count/delete/audit and fine-grained actions.
- [ ] Run product and authorization suites to GREEN.

### Task 4: Generic attachment backend

**Files:** new server attachment module/storage/owner registry/controller/tests, app module/config.

**Interfaces:** Produces list/upload/download/update/delete APIs consumed by `AttachmentPanel`.

- [ ] Add failing tests for safe storage key, owner validation, size/type rejection, download headers, optimistic update and delete retry state.
- [ ] Run tests to observe RED.
- [ ] Implement storage adapter, PRODUCT owner resolver, service/controller and audit.
- [ ] Run attachment/API suites to GREEN.

### Task 5: Product workspace frontend

**Files:** product pages/panels, AttachmentPanel, gateway, ShowcaseApp/routes/styles and Vitest files.

**Interfaces:** Consumes Tasks 2–4 HTTP contracts; produces the user-visible three-tab product workspace.

- [ ] Add failing UI tests for list navigation, fixed tab title, edit save/cancel, price forms, attachment operations and permission-negative states.
- [ ] Run focused Vitest tests to observe RED.
- [ ] Implement dynamic route, product detail, pricing panel and parameterized attachment panel.
- [ ] Run web tests/typecheck/build to GREEN.

### Task 6: Seed, integration and review

**Files:** seed definitions/data/tests, browser QA, slice review/evidence/pipeline state.

**Interfaces:** Consumes all previous tasks and produces releasable local evidence.

- [ ] Add/adjust failing seed and cross-module integration tests for admin/viewer actions.
- [ ] Implement seed compatibility and run migrations/seed against the local database.
- [ ] Run contracts/server/web tests, typecheck, build, DB governance and SDD full checks.
- [ ] Perform browser QA for admin and viewer; record real evidence and limitations.
- [ ] Complete fresh whole-change review, fix important findings with RED→GREEN, then update review and pipeline state.
