CREATE UNIQUE INDEX "md_item_id_tenant_key" ON "md_item"("item_id", "tenant_id");

CREATE TABLE "scm_bom" (
  "bom_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "bom_code" VARCHAR(32) NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "base_quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL,
  "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "scm_bom_pkey" PRIMARY KEY ("bom_id"),
  CONSTRAINT "scm_bom_status_chk" CHECK ("status" IN ('DRAFT','PUBLISHED')),
  CONSTRAINT "scm_bom_revision_chk" CHECK ("revision" > 0 AND "row_version" > 0),
  CONSTRAINT "scm_bom_qty_chk" CHECK ("base_quantity" > 0),
  CONSTRAINT "scm_bom_app_fk" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT,
  CONSTRAINT "scm_bom_item_fk" FOREIGN KEY ("item_id", "tenant_id") REFERENCES "md_item"("item_id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "scm_bom_item_rev_key" ON "scm_bom"("application_id", "item_id", "revision");
CREATE UNIQUE INDEX "scm_bom_code_rev_key" ON "scm_bom"("application_id", "bom_code", "revision");
CREATE UNIQUE INDEX "scm_bom_scope_key" ON "scm_bom"("bom_id", "application_id", "tenant_id");
CREATE UNIQUE INDEX "scm_bom_current_key" ON "scm_bom"("application_id", "item_id") WHERE "is_current" = true;
CREATE UNIQUE INDEX "scm_bom_draft_key" ON "scm_bom"("application_id", "item_id") WHERE "status" = 'DRAFT';
CREATE INDEX "scm_bom_list_idx" ON "scm_bom"("tenant_id", "application_id", "status", "updated_at");

CREATE TABLE "scm_bom_line" (
  "line_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "bom_id" UUID NOT NULL,
  "line_code" VARCHAR(32) NOT NULL,
  "item_id" UUID NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 10,
  "child_bom_id" UUID,
  CONSTRAINT "scm_bom_line_pkey" PRIMARY KEY ("line_id"),
  CONSTRAINT "scm_bom_line_qty_chk" CHECK ("quantity" > 0),
  CONSTRAINT "scm_bom_line_bom_fk" FOREIGN KEY ("bom_id", "application_id", "tenant_id") REFERENCES "scm_bom"("bom_id", "application_id", "tenant_id") ON DELETE CASCADE,
  CONSTRAINT "scm_bom_line_item_fk" FOREIGN KEY ("item_id", "tenant_id") REFERENCES "md_item"("item_id", "tenant_id") ON DELETE RESTRICT,
  CONSTRAINT "scm_bom_line_child_fk" FOREIGN KEY ("child_bom_id", "application_id", "tenant_id") REFERENCES "scm_bom"("bom_id", "application_id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "scm_bom_line_code_key" ON "scm_bom_line"("bom_id", "line_code");
CREATE UNIQUE INDEX "scm_bom_line_scope_key" ON "scm_bom_line"("line_id", "application_id", "tenant_id");
CREATE INDEX "scm_bom_line_item_idx" ON "scm_bom_line"("application_id", "item_id");

CREATE TABLE "scm_bom_alternative" (
  "alternative_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "line_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "ratio" DECIMAL(18,4) NOT NULL DEFAULT 1,
  CONSTRAINT "scm_bom_alternative_pkey" PRIMARY KEY ("alternative_id"),
  CONSTRAINT "scm_bom_alt_values_chk" CHECK ("priority" > 0 AND "ratio" > 0),
  CONSTRAINT "scm_bom_alt_line_fk" FOREIGN KEY ("line_id", "application_id", "tenant_id") REFERENCES "scm_bom_line"("line_id", "application_id", "tenant_id") ON DELETE CASCADE,
  CONSTRAINT "scm_bom_alt_item_fk" FOREIGN KEY ("item_id", "tenant_id") REFERENCES "md_item"("item_id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "scm_bom_alt_item_key" ON "scm_bom_alternative"("line_id", "item_id");
CREATE UNIQUE INDEX "scm_bom_alt_priority_key" ON "scm_bom_alternative"("line_id", "priority");
CREATE INDEX "scm_bom_alt_lookup_idx" ON "scm_bom_alternative"("application_id", "item_id");
