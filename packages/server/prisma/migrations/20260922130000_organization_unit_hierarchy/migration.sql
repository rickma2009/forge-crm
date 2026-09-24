CREATE TYPE "OrgUnitType" AS ENUM ('COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM');

CREATE TABLE "org_unit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "unit_code" VARCHAR(64) NOT NULL,
  "unit_name" VARCHAR(128) NOT NULL,
  "unit_type" "OrgUnitType" NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3),
  "remark" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "org_unit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_unit_period_check" CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  CONSTRAINT "org_unit_not_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
);

CREATE UNIQUE INDEX "org_unit_tenant_code_key" ON "org_unit"("tenant_id", "unit_code");
CREATE UNIQUE INDEX "org_unit_id_tenant_key" ON "org_unit"("id", "tenant_id");
CREATE INDEX "org_unit_tree_idx" ON "org_unit"("tenant_id", "parent_id", "sort_no");
CREATE INDEX "org_unit_status_idx" ON "org_unit"("tenant_id", "status");
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_parent_tenant_fkey" FOREIGN KEY ("parent_id", "tenant_id") REFERENCES "org_unit"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
