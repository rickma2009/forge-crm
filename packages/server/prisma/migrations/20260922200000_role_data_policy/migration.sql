-- Additive policy storage. No resource is enrolled and no existing grant is changed.
CREATE TABLE "sys_authorization_resource" (
  "id" uuid PRIMARY KEY, "application_id" uuid NOT NULL,
  "resource_code" varchar(128) NOT NULL, "resource_name" varchar(128) NOT NULL,
  "binding_key" varchar(128) NOT NULL, "enabled" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "updated_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_auth_resource_app_fk" FOREIGN KEY ("application_id") REFERENCES "sys_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_auth_resource_code_key" UNIQUE ("application_id", "resource_code"),
  CONSTRAINT "sys_auth_resource_binding_key" UNIQUE ("application_id", "binding_key"),
  CONSTRAINT "sys_auth_resource_scope_key" UNIQUE ("id", "application_id")
);
CREATE TABLE "sys_authorization_field" (
  "id" uuid PRIMARY KEY, "resource_id" uuid NOT NULL,
  "field_code" varchar(128) NOT NULL, "field_name" varchar(128) NOT NULL,
  "binding_key" varchar(128) NOT NULL, "field_type" varchar(16) NOT NULL,
  "group_name" varchar(64) NOT NULL DEFAULT '基本字段',
  "source" varchar(16) NOT NULL DEFAULT 'SYSTEM' CHECK ("source" IN ('SYSTEM','CUSTOM')),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "value_source" jsonb,
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_auth_field_resource_fk" FOREIGN KEY ("resource_id") REFERENCES "sys_authorization_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_auth_field_code_key" UNIQUE ("resource_id", "field_code"),
  CONSTRAINT "sys_auth_field_scope_key" UNIQUE ("id", "resource_id"),
  CONSTRAINT "sys_auth_field_type_check" CHECK ("field_type" IN ('string','number','boolean','date','collection'))
);
CREATE TABLE "sys_role_data_policy" (
  "id" uuid PRIMARY KEY, "application_id" uuid NOT NULL, "role_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL, "action_code" varchar(32) NOT NULL CHECK ("action_code" IN ('read','create','update')),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "published_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "sys_role_data_policy_role_fk" FOREIGN KEY ("role_id", "application_id") REFERENCES "sys_role"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_data_policy_resource_fk" FOREIGN KEY ("resource_id", "application_id") REFERENCES "sys_authorization_resource"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_data_policy_scope_key" UNIQUE ("role_id", "resource_id", "action_code"),
  CONSTRAINT "sys_role_data_policy_resource_key" UNIQUE ("id", "resource_id")
);
CREATE TABLE "sys_role_data_rule" (
  "id" uuid PRIMARY KEY, "policy_id" uuid NOT NULL, "rule_name" varchar(128) NOT NULL,
  "effect" varchar(8) NOT NULL CHECK ("effect" IN ('ALLOW','DENY')),
  "enabled" boolean NOT NULL DEFAULT true, "sort_no" integer NOT NULL DEFAULT 0,
  "condition" jsonb NOT NULL,
  CONSTRAINT "sys_role_data_rule_policy_fk" FOREIGN KEY ("policy_id") REFERENCES "sys_role_data_policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "sys_role_data_rule_policy_idx" ON "sys_role_data_rule"("policy_id","enabled");
CREATE TABLE "sys_role_field_rule" (
  "id" uuid PRIMARY KEY, "policy_id" uuid NOT NULL, "resource_id" uuid NOT NULL, "field_id" uuid NOT NULL,
  "visible" boolean NOT NULL, "writable" boolean NOT NULL, "exportable" boolean NOT NULL,
  "mask" varchar(16) NOT NULL CHECK ("mask" IN ('NONE','PHONE','AMOUNT','PARTIAL')),
  CONSTRAINT "sys_role_field_rule_export_check" CHECK (NOT "exportable" OR "visible"),
  CONSTRAINT "sys_role_field_rule_policy_fk" FOREIGN KEY ("policy_id","resource_id") REFERENCES "sys_role_data_policy"("id","resource_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_field_rule_field_fk" FOREIGN KEY ("field_id","resource_id") REFERENCES "sys_authorization_field"("id","resource_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_role_field_rule_field_key" UNIQUE ("policy_id","field_id")
);
CREATE TABLE "sys_policy_revision" (
  "id" uuid PRIMARY KEY, "policy_id" uuid NOT NULL, "version" integer NOT NULL CHECK ("version" > 0),
  "snapshot" jsonb NOT NULL, "summary" varchar(500) NOT NULL,
  "published_by" uuid NOT NULL REFERENCES "sys_user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_policy_revision_policy_fk" FOREIGN KEY ("policy_id") REFERENCES "sys_role_data_policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_policy_revision_version_key" UNIQUE ("policy_id","version")
);
