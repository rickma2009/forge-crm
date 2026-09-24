CREATE TYPE "PageResourceType" AS ENUM ('SYSTEM', 'MODULE', 'PAGE', 'SUBPAGE', 'COMPONENT');
CREATE TYPE "ResourcePermissionMode" AS ENUM ('RESTRICTED', 'COMMON');
CREATE TYPE "ResourceButtonType" AS ENUM ('TOOL', 'LINE');

CREATE TABLE "sys_page_resource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "page_code" VARCHAR(128) NOT NULL,
  "page_name" VARCHAR(128) NOT NULL,
  "parent_id" UUID,
  "page_type" "PageResourceType" NOT NULL,
  "route_path" VARCHAR(256),
  "icon_key" VARCHAR(64) NOT NULL,
  "permission_mode" "ResourcePermissionMode" NOT NULL DEFAULT 'RESTRICTED',
  "is_auto_add_menu" BOOLEAN NOT NULL DEFAULT true,
  "is_view_config_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_group_manage_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_data_permission_enabled" BOOLEAN NOT NULL DEFAULT false,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "remark" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_page_resource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_page_resource_not_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
  CONSTRAINT "sys_page_resource_code_format_check" CHECK ("page_code" ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'),
  CONSTRAINT "sys_page_resource_route_shape_check" CHECK (("page_type" IN ('PAGE','SUBPAGE') AND "route_path" LIKE '/%') OR ("page_type" NOT IN ('PAGE','SUBPAGE'))),
  CONSTRAINT "sys_page_resource_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "sys_page_resource_application_code_key" ON "sys_page_resource"("application_id", "page_code");
CREATE UNIQUE INDEX "sys_page_resource_id_application_key" ON "sys_page_resource"("id", "application_id");
CREATE INDEX "sys_page_resource_tree_idx" ON "sys_page_resource"("application_id", "parent_id", "status", "sort_no");
ALTER TABLE "sys_page_resource" ADD CONSTRAINT "sys_page_resource_application_scope_fkey" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sys_page_resource" ADD CONSTRAINT "sys_page_resource_parent_application_fkey" FOREIGN KEY ("parent_id", "application_id") REFERENCES "sys_page_resource"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sys_page_button" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "page_id" UUID NOT NULL,
  "button_code" VARCHAR(128) NOT NULL, "button_name" VARCHAR(128) NOT NULL,
  "button_type" "ResourceButtonType" NOT NULL, "icon_key" VARCHAR(64), "event_name" VARCHAR(128),
  "sort_no" INTEGER NOT NULL DEFAULT 0, "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "remark" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1, "created_by" UUID NOT NULL, "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_page_button_pkey" PRIMARY KEY ("id"), CONSTRAINT "sys_page_button_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sys_page_button_page_code_key" ON "sys_page_button"("page_id", "button_code");
CREATE INDEX "sys_page_button_lookup_idx" ON "sys_page_button"("page_id", "status", "sort_no");
ALTER TABLE "sys_page_button" ADD CONSTRAINT "sys_page_button_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "sys_page_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sys_page_tab" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "page_id" UUID NOT NULL, "target_page_id" UUID NOT NULL,
  "tab_name" VARCHAR(80) NOT NULL, "sort_no" INTEGER NOT NULL DEFAULT 0, "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "remark" VARCHAR(300), "version" INTEGER NOT NULL DEFAULT 1, "created_by" UUID NOT NULL, "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_page_tab_pkey" PRIMARY KEY ("id"), CONSTRAINT "sys_page_tab_not_self_check" CHECK ("page_id" <> "target_page_id"), CONSTRAINT "sys_page_tab_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sys_page_tab_page_name_key" ON "sys_page_tab"("page_id", "tab_name");
CREATE INDEX "sys_page_tab_lookup_idx" ON "sys_page_tab"("page_id", "status", "sort_no");
CREATE INDEX "sys_page_tab_target_idx" ON "sys_page_tab"("target_page_id");
ALTER TABLE "sys_page_tab" ADD CONSTRAINT "sys_page_tab_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "sys_page_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sys_page_tab" ADD CONSTRAINT "sys_page_tab_target_page_id_fkey" FOREIGN KEY ("target_page_id") REFERENCES "sys_page_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sys_menu" ADD COLUMN "page_resource_id" UUID;
ALTER TABLE "sys_menu" ADD COLUMN "menu_type" VARCHAR(20) NOT NULL DEFAULT 'PAGE';
ALTER TABLE "sys_menu" ADD COLUMN "open_type" VARCHAR(20) NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "sys_menu" ADD COLUMN "is_auto_add" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "sys_menu" ADD COLUMN "remark" VARCHAR(500);

INSERT INTO "sys_page_resource" ("id","tenant_id","application_id","page_code","page_name","parent_id","page_type","route_path","icon_key","is_auto_add_menu","sort_no","status","created_by","updated_by")
SELECT app."id",app."tenant_id",app."id",app."application_code",app."application_name",NULL,'SYSTEM',NULL,'portal',false,0,app."status",usr."id",usr."id"
FROM "sys_application" app
JOIN LATERAL (SELECT u."id" FROM "sys_user" u WHERE u."tenant_id"=app."tenant_id" ORDER BY (u."normalized_account"='admin') DESC,u."id" LIMIT 1) usr ON true
ON CONFLICT ("application_id","page_code") DO NOTHING;

INSERT INTO "sys_page_resource" ("id","tenant_id","application_id","page_code","page_name","parent_id","page_type","route_path","icon_key","sort_no","status","version","created_by","updated_by","created_at","updated_at")
SELECT menu."id",app."tenant_id",app."id",menu."menu_code",CASE WHEN menu."menu_code"='system-menus' THEN '资源菜单' ELSE menu."menu_name" END,
       COALESCE(menu."parent_id",app."id"),CASE WHEN menu."node_type"='GROUP' THEN 'MODULE'::"PageResourceType" ELSE 'PAGE'::"PageResourceType" END,
       menu."route_path",menu."icon_key",menu."sort_no",menu."status",menu."version",usr."id",usr."id",menu."created_at",menu."updated_at"
FROM "sys_menu" menu JOIN "sys_application" app ON app."id"=menu."application_id"
JOIN LATERAL (SELECT u."id" FROM "sys_user" u WHERE u."tenant_id"=app."tenant_id" ORDER BY (u."normalized_account"='admin') DESC,u."id" LIMIT 1) usr ON true
ON CONFLICT ("application_id","page_code") DO NOTHING;

UPDATE "sys_menu" SET "page_resource_id"="id", "menu_name"=CASE WHEN "menu_code"='system-menus' THEN '资源菜单' ELSE "menu_name" END,
  "menu_type"=CASE WHEN "node_type"='GROUP' THEN 'DIRECTORY' ELSE 'PAGE' END;
CREATE INDEX "sys_menu_page_resource_idx" ON "sys_menu"("page_resource_id");
ALTER TABLE "sys_menu" ADD CONSTRAINT "sys_menu_page_resource_id_fkey" FOREIGN KEY ("page_resource_id") REFERENCES "sys_page_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "sys_page_button" ("id","page_id","button_code","button_name","button_type","sort_no","status","version","created_by","updated_by","created_at","updated_at")
SELECT action."id",action."menu_id",action."action_code",action."action_name",CASE WHEN action."action_type"='LINE' THEN 'LINE'::"ResourceButtonType" ELSE 'TOOL'::"ResourceButtonType" END,
       action."sort_no",action."status",action."version",usr."id",usr."id",action."created_at",action."updated_at"
FROM "sys_menu_action" action JOIN "sys_menu" menu ON menu."id"=action."menu_id" JOIN "sys_application" app ON app."id"=menu."application_id"
JOIN LATERAL (SELECT u."id" FROM "sys_user" u WHERE u."tenant_id"=app."tenant_id" ORDER BY (u."normalized_account"='admin') DESC,u."id" LIMIT 1) usr ON true
ON CONFLICT ("page_id","button_code") DO NOTHING;
