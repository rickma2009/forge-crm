-- Identity accounts are unique inside a tenant, not across the whole platform.
DROP INDEX IF EXISTS "iam_user_normalized_account_key";

CREATE UNIQUE INDEX "sys_user_tenant_normalized_account_key"
  ON "sys_user"("tenant_id", "normalized_account");
