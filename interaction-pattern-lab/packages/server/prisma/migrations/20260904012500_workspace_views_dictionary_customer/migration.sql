DROP INDEX IF EXISTS "ui_menu_navigation_idx";
ALTER TABLE "ui_menu" DROP COLUMN "menu_zone";
DROP TYPE "MenuZone";
CREATE INDEX "ui_menu_navigation_idx" ON "ui_menu"("system_code", "status", "parent_id", "sort_no");

CREATE TABLE "sys_dictionary" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "dict_code" VARCHAR(64) NOT NULL,
  "dict_name" VARCHAR(128) NOT NULL,
  "group_code" VARCHAR(64),
  "description" VARCHAR(512),
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL,
  "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sys_dictionary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_dictionary_code_check" CHECK ("dict_code" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "sys_dictionary_version_check" CHECK ("version" > 0)
);

CREATE TABLE "sys_dictionary_item" (
  "id" UUID NOT NULL,
  "dictionary_id" UUID NOT NULL,
  "item_code" VARCHAR(64) NOT NULL,
  "item_value" VARCHAR(128) NOT NULL,
  "item_name" VARCHAR(128) NOT NULL,
  "color_key" VARCHAR(32),
  "description" VARCHAR(512),
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL,
  "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sys_dictionary_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_dictionary_item_version_check" CHECK ("version" > 0)
);

CREATE TABLE "ui_system_list_view" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "page_code" VARCHAR(64) NOT NULL,
  "action_code" VARCHAR(64) NOT NULL,
  "view_code" VARCHAR(64) NOT NULL,
  "view_name" VARCHAR(128) NOT NULL,
  "description" VARCHAR(512),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "allow_personal_override" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL,
  "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ui_system_list_view_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_system_list_view_version_check" CHECK ("version" > 0)
);

CREATE TABLE "iam_role_list_view" (
  "role_id" UUID NOT NULL,
  "view_id" UUID NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "iam_role_list_view_pkey" PRIMARY KEY ("role_id", "view_id")
);

CREATE TABLE "ui_user_list_view" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "page_code" VARCHAR(64) NOT NULL,
  "action_code" VARCHAR(64) NOT NULL,
  "base_view_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "view_name" VARCHAR(128) NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "config" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ui_user_list_view_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_user_list_view_version_check" CHECK ("version" > 0)
);

CREATE TABLE "ui_user_list_view_preference" (
  "user_id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "page_code" VARCHAR(64) NOT NULL,
  "action_code" VARCHAR(64) NOT NULL,
  "selected_view_key" VARCHAR(160) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ui_user_list_view_preference_pkey" PRIMARY KEY ("user_id", "system_code", "page_code", "action_code")
);

CREATE TABLE "crm_customer" (
  "id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "customer_code" VARCHAR(20) NOT NULL,
  "customer_name" VARCHAR(255) NOT NULL,
  "short_name" VARCHAR(100) NOT NULL,
  "category_value" VARCHAR(128) NOT NULL,
  "address" VARCHAR(500),
  "status_value" VARCHAR(128) NOT NULL,
  "industry_value" VARCHAR(128),
  "level_value" VARCHAR(128),
  "sales_owner_key" VARCHAR(128),
  "sales_owner_name" VARCHAR(128),
  "remark" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL,
  "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_customer_code_check" CHECK ("customer_code" ~ '^C[0-9]{10}$'),
  CONSTRAINT "crm_customer_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "sys_dictionary_system_code_dict_code_key" ON "sys_dictionary"("system_code", "dict_code");
CREATE INDEX "sys_dictionary_lookup_idx" ON "sys_dictionary"("system_code", "status", "sort_no");
CREATE UNIQUE INDEX "sys_dictionary_item_dict_code_key" ON "sys_dictionary_item"("dictionary_id", "item_code");
CREATE UNIQUE INDEX "sys_dictionary_item_dict_value_key" ON "sys_dictionary_item"("dictionary_id", "item_value");
CREATE INDEX "sys_dictionary_item_lookup_idx" ON "sys_dictionary_item"("dictionary_id", "status", "sort_no");
CREATE UNIQUE INDEX "ui_system_list_view_scope_code_key" ON "ui_system_list_view"("system_code", "page_code", "action_code", "view_code");
CREATE UNIQUE INDEX "ui_system_list_view_one_default_key" ON "ui_system_list_view"("system_code", "page_code", "action_code") WHERE "is_default" = true AND "status" = 'ACTIVE';
CREATE INDEX "ui_system_list_view_lookup_idx" ON "ui_system_list_view"("system_code", "page_code", "action_code", "status", "priority");
CREATE INDEX "iam_role_list_view_lookup_idx" ON "iam_role_list_view"("view_id", "status");
CREATE UNIQUE INDEX "ui_user_list_view_owner_scope_name_key" ON "ui_user_list_view"("user_id", "system_code", "page_code", "action_code", "view_name");
CREATE UNIQUE INDEX "ui_user_list_view_one_default_key" ON "ui_user_list_view"("user_id", "system_code", "page_code", "action_code") WHERE "is_default" = true;
CREATE INDEX "ui_user_list_view_lookup_idx" ON "ui_user_list_view"("user_id", "system_code", "page_code", "action_code");
CREATE UNIQUE INDEX "crm_customer_system_code_customer_code_key" ON "crm_customer"("system_code", "customer_code");
CREATE UNIQUE INDEX "crm_customer_system_code_customer_name_key" ON "crm_customer"("system_code", "customer_name");
CREATE INDEX "crm_customer_list_idx" ON "crm_customer"("system_code", "status_value", "category_value", "updated_at" DESC);

ALTER TABLE "sys_dictionary_item" ADD CONSTRAINT "sys_dictionary_item_dictionary_id_fkey" FOREIGN KEY ("dictionary_id") REFERENCES "sys_dictionary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_list_view" ADD CONSTRAINT "iam_role_list_view_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_list_view" ADD CONSTRAINT "iam_role_list_view_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "ui_system_list_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_user_list_view" ADD CONSTRAINT "ui_user_list_view_base_view_id_fkey" FOREIGN KEY ("base_view_id") REFERENCES "ui_system_list_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_user_list_view" ADD CONSTRAINT "ui_user_list_view_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_user_list_view_preference" ADD CONSTRAINT "ui_user_list_view_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
