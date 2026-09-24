-- Organization employee master data and account binding.
-- This forward migration preserves the previously seeded organization IDs while
-- renaming the neutral demo hierarchy to the approved demonstration hierarchy.

UPDATE "org_unit" SET "unit_code" = 'component-bg', "unit_name" = '部件BG', "updated_at" = CURRENT_TIMESTAMP
WHERE "unit_code" = 'demo-company' AND NOT EXISTS (SELECT 1 FROM "org_unit" WHERE "unit_code" = 'component-bg');
UPDATE "org_unit" SET "unit_code" = 'tv-division', "unit_name" = 'TV事业部', "updated_at" = CURRENT_TIMESTAMP
WHERE "unit_code" = 'sales-division' AND NOT EXISTS (SELECT 1 FROM "org_unit" WHERE "unit_code" = 'tv-division');
UPDATE "org_unit" SET "unit_code" = 'tv-sales-one', "unit_name" = '销售一部', "updated_at" = CURRENT_TIMESTAMP
WHERE "unit_code" = 'south-sales' AND NOT EXISTS (SELECT 1 FROM "org_unit" WHERE "unit_code" = 'tv-sales-one');
UPDATE "org_unit" SET "unit_code" = 'tv-sales-admin', "unit_name" = '销售管理部', "unit_type" = 'DEPARTMENT', "updated_at" = CURRENT_TIMESTAMP
WHERE "unit_code" = 'key-account-team' AND NOT EXISTS (SELECT 1 FROM "org_unit" WHERE "unit_code" = 'tv-sales-admin');
UPDATE "org_unit" SET "unit_code" = 'power-division', "unit_name" = '电源事业部', "updated_at" = CURRENT_TIMESTAMP
WHERE "unit_code" = 'product-center' AND NOT EXISTS (SELECT 1 FROM "org_unit" WHERE "unit_code" = 'power-division');

CREATE TABLE "org_employee" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "employee_name" varchar(128) NOT NULL,
  "email" varchar(256),
  "mobile" varchar(32),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "remark" varchar(500),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "org_employee_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_employee_id_tenant_key" UNIQUE ("id", "tenant_id")
);
CREATE INDEX "org_employee_lookup_idx" ON "org_employee"("tenant_id", "status", "employee_name");

CREATE TABLE "org_employment" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "employee_no" varchar(64) NOT NULL,
  "employment_type" varchar(32) NOT NULL DEFAULT 'FULL_TIME',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "org_employment_period_check" CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  CONSTRAINT "org_employment_employee_fk" FOREIGN KEY ("employee_id", "tenant_id") REFERENCES "org_employee"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_employment_tenant_employee_no_key" UNIQUE ("tenant_id", "employee_no")
);
CREATE INDEX "org_employment_active_idx" ON "org_employment"("employee_id", "status", "effective_at", "expires_at");

CREATE TABLE "org_position" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "position_code" varchar(64) NOT NULL,
  "position_name" varchar(128) NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "org_position_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_position_tenant_code_key" UNIQUE ("tenant_id", "position_code"),
  CONSTRAINT "org_position_id_tenant_key" UNIQUE ("id", "tenant_id")
);
CREATE INDEX "org_position_lookup_idx" ON "org_position"("tenant_id", "status", "position_name");

CREATE TABLE "org_employee_assignment" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "org_unit_id" uuid NOT NULL,
  "position_id" uuid NOT NULL,
  "position_name_snapshot" varchar(128) NOT NULL,
  "assignment_type" varchar(32) NOT NULL DEFAULT 'PRIMARY',
  "is_primary" boolean NOT NULL DEFAULT true,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "org_employee_assignment_period_check" CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  CONSTRAINT "org_employee_assignment_employee_fk" FOREIGN KEY ("employee_id", "tenant_id") REFERENCES "org_employee"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_employee_assignment_org_fk" FOREIGN KEY ("org_unit_id", "tenant_id") REFERENCES "org_unit"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_employee_assignment_position_fk" FOREIGN KEY ("position_id", "tenant_id") REFERENCES "org_position"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_employee_assignment_period_key" UNIQUE ("employee_id", "org_unit_id", "position_id", "effective_at")
);
CREATE UNIQUE INDEX "org_employee_assignment_open_primary_key" ON "org_employee_assignment"("employee_id")
WHERE "is_primary" = true AND "status" = 'ACTIVE' AND "expires_at" IS NULL;
CREATE INDEX "org_employee_assignment_active_idx" ON "org_employee_assignment"("employee_id", "status", "effective_at", "expires_at");
CREATE INDEX "org_employee_assignment_org_idx" ON "org_employee_assignment"("org_unit_id", "status");

ALTER TABLE "sys_user" ADD COLUMN "employee_id" uuid;
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_employee_id_key" UNIQUE ("employee_id");
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_employee_tenant_key" UNIQUE ("employee_id", "tenant_id");
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_employee_scope_fk"
FOREIGN KEY ("employee_id", "tenant_id") REFERENCES "org_employee"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
