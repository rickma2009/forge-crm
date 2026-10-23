CREATE TABLE "sys_de_workspace" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_de_workspace_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sys_de_workspace_app_key" ON "sys_de_workspace"("application_id");
CREATE UNIQUE INDEX "sys_de_workspace_scope_key" ON "sys_de_workspace"("id","tenant_id","application_id");

CREATE TABLE "int_de_connection" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_code" VARCHAR(64) NOT NULL,
  "connection_name" VARCHAR(120) NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'WAITING_CONFIG',
  "config" JSONB NOT NULL,
  "credential_cipher" TEXT,
  "last_checked_at" TIMESTAMPTZ(3),
  "last_error" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_connection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "int_de_connection_app_code_key" ON "int_de_connection"("application_id","connection_code");
CREATE UNIQUE INDEX "int_de_connection_scope_key" ON "int_de_connection"("id","tenant_id","application_id");
CREATE INDEX "int_de_connection_list_idx" ON "int_de_connection"("application_id","category","status");
