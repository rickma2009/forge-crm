UPDATE "sys_role_user" SET "effective_at" = COALESCE("effective_at", "created_at");
ALTER TABLE "sys_role_user" ALTER COLUMN "effective_at" SET NOT NULL;
ALTER TABLE "sys_role_user" ALTER COLUMN "effective_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "sys_role_user" ADD CONSTRAINT "sys_role_user_no_overlap" EXCLUDE USING gist (
  "role_id" WITH =,
  "user_id" WITH =,
  tstzrange("effective_at", "expires_at", '[)') WITH &&
) WHERE ("status" = 'ACTIVE');
