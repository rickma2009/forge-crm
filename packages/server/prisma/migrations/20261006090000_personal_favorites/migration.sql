CREATE TABLE "sys_user_favorite" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "target_type" VARCHAR(24) NOT NULL,
  "target_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_user_favorite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_user_favorite_type_check" CHECK ("target_type" IN ('CUSTOMER', 'PRODUCT', 'ITEM', 'OPPORTUNITY', 'QUOTATION', 'SALES_ORDER')),
  CONSTRAINT "sys_user_favorite_target_key" UNIQUE ("application_id", "user_id", "target_type", "target_id"),
  CONSTRAINT "sys_user_favorite_scope_key" UNIQUE ("id", "tenant_id", "application_id"),
  CONSTRAINT "sys_user_favorite_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_user_favorite_application_scope_fkey" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "sys_user_favorite_user_scope_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "sys_user"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "sys_user_favorite_owner_idx" ON "sys_user_favorite" ("application_id", "user_id", "created_at" DESC, "id" DESC);
