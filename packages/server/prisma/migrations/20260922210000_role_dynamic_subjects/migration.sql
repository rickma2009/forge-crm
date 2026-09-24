-- Dynamic subjects are references, never copied into direct role membership.
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_id_tenant_key" UNIQUE ("id","tenant_id");
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_id_application_tenant_key" UNIQUE ("id","application_id","tenant_id");
CREATE TABLE "org_user_assignment" (
  "id" uuid PRIMARY KEY, "tenant_id" uuid NOT NULL, "org_unit_id" uuid NOT NULL, "user_id" uuid NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "org_user_assignment_org_fk" FOREIGN KEY ("org_unit_id","tenant_id") REFERENCES "org_unit"("id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_user_assignment_user_fk" FOREIGN KEY ("user_id","tenant_id") REFERENCES "sys_user"("id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "org_user_assignment_period_key" UNIQUE ("org_unit_id","user_id","effective_at")
);
CREATE INDEX "org_user_assignment_active_idx" ON "org_user_assignment"("user_id","status","effective_at","expires_at");
CREATE TABLE "sys_user_group" (
  "id" uuid PRIMARY KEY, "application_id" uuid NOT NULL, "tenant_id" uuid NOT NULL,
  "group_code" varchar(64) NOT NULL, "group_name" varchar(128) NOT NULL, "description" varchar(500),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_user_group_app_fk" FOREIGN KEY ("application_id","tenant_id") REFERENCES "sys_application"("id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_user_group_code_key" UNIQUE ("application_id","group_code"),
  CONSTRAINT "sys_user_group_scope_key" UNIQUE ("id","application_id","tenant_id")
);
CREATE TABLE "sys_user_group_member" (
  "id" uuid PRIMARY KEY, "application_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "group_id" uuid NOT NULL, "user_id" uuid NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_user_group_member_group_fk" FOREIGN KEY ("group_id","application_id","tenant_id") REFERENCES "sys_user_group"("id","application_id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_user_group_member_user_fk" FOREIGN KEY ("user_id","tenant_id") REFERENCES "sys_user"("id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_user_group_member_period_key" UNIQUE ("group_id","user_id","effective_at")
);
CREATE INDEX "sys_user_group_member_active_idx" ON "sys_user_group_member"("user_id","application_id","status");
CREATE TABLE "sys_role_subject_binding" (
  "id" uuid PRIMARY KEY, "application_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "role_id" uuid NOT NULL,
  "org_unit_id" uuid, "group_id" uuid, "include_descendants" boolean NOT NULL DEFAULT false,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at"),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_role_subject_one_kind" CHECK (("org_unit_id" IS NOT NULL)::integer + ("group_id" IS NOT NULL)::integer = 1),
  CONSTRAINT "sys_role_subject_descendants_check" CHECK ("group_id" IS NULL OR NOT "include_descendants"),
  CONSTRAINT "sys_role_subject_role_fk" FOREIGN KEY ("role_id","application_id","tenant_id") REFERENCES "sys_role"("id","application_id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_subject_org_fk" FOREIGN KEY ("org_unit_id","tenant_id") REFERENCES "org_unit"("id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_subject_group_fk" FOREIGN KEY ("group_id","application_id","tenant_id") REFERENCES "sys_user_group"("id","application_id","tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_subject_org_period_key" UNIQUE ("role_id","org_unit_id","effective_at"),
  CONSTRAINT "sys_role_subject_group_period_key" UNIQUE ("role_id","group_id","effective_at")
);
CREATE INDEX "sys_role_subject_binding_active_idx" ON "sys_role_subject_binding"("application_id","status","effective_at","expires_at");
