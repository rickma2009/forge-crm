CREATE TABLE "sys_parameter" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL,
  "parameter_code" varchar(64) NOT NULL, "parameter_name" varchar(128) NOT NULL,
  "parameter_value" varchar(1000), "usage_note" varchar(1000) NOT NULL,
  "sort_no" integer NOT NULL DEFAULT 0, "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(128) NOT NULL, "updated_by" varchar(128) NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "sys_parameter_scope_code_key" UNIQUE ("tenant_id", "application_id", "parameter_code"),
  CONSTRAINT "sys_parameter_app_scope_fk" FOREIGN KEY ("application_id", "tenant_id")
    REFERENCES "sys_application" ("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "sys_parameter_list_idx" ON "sys_parameter"("tenant_id", "application_id", "sort_no", "parameter_code");
