-- Additive only: preserve role IDs, grants, memberships and audit history.
ALTER TABLE "sys_role" ADD COLUMN "archived_at" timestamptz(3);
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_parent_application_fkey"
  FOREIGN KEY ("parent_id", "application_id") REFERENCES "sys_role" ("id", "application_id") ON DELETE RESTRICT;
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_not_own_parent_check"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_effective_period_check"
  CHECK ("effective_date_begin" IS NULL OR "effective_date_end" IS NULL OR "effective_date_begin" < "effective_date_end");
