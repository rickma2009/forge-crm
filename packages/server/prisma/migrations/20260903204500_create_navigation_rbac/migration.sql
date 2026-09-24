CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED');
CREATE TYPE "MenuZone" AS ENUM ('APPLICATION', 'SYSTEM_MANAGEMENT');
CREATE TYPE "MenuNodeType" AS ENUM ('GROUP', 'PAGE');
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'BUSINESS');
CREATE TYPE "PermissionType" AS ENUM ('MENU', 'ACTION');

CREATE TABLE "ui_menu" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "menu_code" VARCHAR(64) NOT NULL,
  "menu_name" VARCHAR(128) NOT NULL,
  "menu_zone" "MenuZone" NOT NULL,
  "node_type" "MenuNodeType" NOT NULL,
  "parent_id" UUID,
  "route_path" VARCHAR(256),
  "icon_key" VARCHAR(64) NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ui_menu_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_menu_code_format_check" CHECK ("menu_code" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
  CONSTRAINT "ui_menu_system_code_format_check" CHECK ("system_code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "ui_menu_node_shape_check" CHECK (("node_type" = 'GROUP' AND "route_path" IS NULL) OR ("node_type" = 'PAGE' AND "route_path" LIKE '/%')),
  CONSTRAINT "ui_menu_not_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
  CONSTRAINT "ui_menu_version_check" CHECK ("version" > 0)
);

CREATE TABLE "ui_menu_action" (
  "id" UUID NOT NULL,
  "menu_id" UUID NOT NULL,
  "action_code" VARCHAR(64) NOT NULL,
  "action_name" VARCHAR(128) NOT NULL,
  "action_type" VARCHAR(64) NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ui_menu_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_menu_action_code_format_check" CHECK ("action_code" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
  CONSTRAINT "ui_menu_action_type_format_check" CHECK ("action_type" ~ '^[A-Z][A-Z0-9_]*$'),
  CONSTRAINT "ui_menu_action_version_check" CHECK ("version" > 0)
);

CREATE TABLE "iam_user" (
  "id" UUID NOT NULL,
  "account" VARCHAR(128) NOT NULL,
  "normalized_account" VARCHAR(128) NOT NULL,
  "display_name" VARCHAR(128) NOT NULL,
  "auth_source" VARCHAR(32) NOT NULL DEFAULT 'LOCAL',
  "external_subject" VARCHAR(256),
  "password_hash" VARCHAR(512),
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "iam_user_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iam_user_version_check" CHECK ("version" > 0),
  CONSTRAINT "iam_user_auth_check" CHECK (("auth_source" = 'LOCAL' AND "password_hash" IS NOT NULL) OR ("auth_source" <> 'LOCAL' AND "external_subject" IS NOT NULL))
);

CREATE TABLE "iam_role" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "role_code" VARCHAR(64) NOT NULL,
  "role_name" VARCHAR(128) NOT NULL,
  "role_type" "RoleType" NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "description" VARCHAR(512),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "iam_role_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iam_role_system_code_format_check" CHECK ("system_code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "iam_role_code_format_check" CHECK ("role_code" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
  CONSTRAINT "iam_role_system_shape_check" CHECK (("is_system" AND "role_type" = 'SYSTEM') OR (NOT "is_system" AND "role_type" = 'BUSINESS')),
  CONSTRAINT "iam_role_version_check" CHECK ("version" > 0)
);

CREATE TABLE "iam_role_user" (
  "role_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "iam_role_user_pkey" PRIMARY KEY ("role_id", "user_id"),
  CONSTRAINT "iam_role_user_period_check" CHECK ("effective_at" IS NULL OR "expires_at" IS NULL OR "effective_at" < "expires_at")
);

CREATE TABLE "iam_role_permission" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "role_id" UUID NOT NULL,
  "menu_id" UUID NOT NULL,
  "permission_type" "PermissionType" NOT NULL,
  "menu_action_id" UUID,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "iam_role_permission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iam_role_permission_shape_check" CHECK (("permission_type" = 'MENU' AND "menu_action_id" IS NULL) OR ("permission_type" = 'ACTION' AND "menu_action_id" IS NOT NULL)),
  CONSTRAINT "iam_role_permission_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ui_menu_system_code_menu_code_key" ON "ui_menu"("system_code", "menu_code");
CREATE UNIQUE INDEX "ui_menu_id_system_code_key" ON "ui_menu"("id", "system_code");
CREATE UNIQUE INDEX "ui_menu_system_route_key" ON "ui_menu"("system_code", "route_path") WHERE "node_type" = 'PAGE' AND "route_path" IS NOT NULL;
CREATE INDEX "ui_menu_navigation_idx" ON "ui_menu"("system_code", "status", "menu_zone", "parent_id", "sort_no");
CREATE UNIQUE INDEX "ui_menu_action_menu_id_action_code_key" ON "ui_menu_action"("menu_id", "action_code");
CREATE UNIQUE INDEX "ui_menu_action_id_menu_id_key" ON "ui_menu_action"("id", "menu_id");
CREATE INDEX "ui_menu_action_lookup_idx" ON "ui_menu_action"("menu_id", "status", "sort_no");
CREATE UNIQUE INDEX "iam_user_normalized_account_key" ON "iam_user"("normalized_account");
CREATE INDEX "iam_user_status_idx" ON "iam_user"("status");
CREATE UNIQUE INDEX "iam_role_system_code_role_code_key" ON "iam_role"("system_code", "role_code");
CREATE UNIQUE INDEX "iam_role_id_system_code_key" ON "iam_role"("id", "system_code");
CREATE UNIQUE INDEX "iam_role_one_system_manager_key" ON "iam_role"("system_code") WHERE "is_system" = true;
CREATE INDEX "iam_role_lookup_idx" ON "iam_role"("system_code", "status");
CREATE INDEX "iam_role_user_effective_idx" ON "iam_role_user"("user_id", "status", "effective_at", "expires_at");
CREATE UNIQUE INDEX "iam_role_permission_menu_key" ON "iam_role_permission"("role_id", "menu_id") WHERE "permission_type" = 'MENU';
CREATE UNIQUE INDEX "iam_role_permission_action_key" ON "iam_role_permission"("role_id", "menu_id", "menu_action_id") WHERE "permission_type" = 'ACTION';
CREATE INDEX "iam_role_permission_role_idx" ON "iam_role_permission"("role_id", "system_code", "status");
CREATE INDEX "iam_role_permission_target_idx" ON "iam_role_permission"("menu_id", "menu_action_id");

ALTER TABLE "ui_menu" ADD CONSTRAINT "ui_menu_parent_id_system_code_fkey" FOREIGN KEY ("parent_id", "system_code") REFERENCES "ui_menu"("id", "system_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_menu_action" ADD CONSTRAINT "ui_menu_action_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "ui_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_user" ADD CONSTRAINT "iam_role_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_user" ADD CONSTRAINT "iam_role_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_permission" ADD CONSTRAINT "iam_role_permission_role_id_system_code_fkey" FOREIGN KEY ("role_id", "system_code") REFERENCES "iam_role"("id", "system_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_permission" ADD CONSTRAINT "iam_role_permission_menu_id_system_code_fkey" FOREIGN KEY ("menu_id", "system_code") REFERENCES "ui_menu"("id", "system_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_permission" ADD CONSTRAINT "iam_role_permission_menu_action_id_menu_id_fkey" FOREIGN KEY ("menu_action_id", "menu_id") REFERENCES "ui_menu_action"("id", "menu_id") ON DELETE RESTRICT ON UPDATE CASCADE;
