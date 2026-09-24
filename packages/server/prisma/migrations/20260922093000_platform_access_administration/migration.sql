-- Slice 012: preserve existing identifiers while moving platform data to sys_* tables.
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL', 'SERVICE');
CREATE TYPE "PermissionSource" AS ENUM ('SYSTEM', 'CUSTOM');

ALTER TABLE "ui_menu" RENAME TO "sys_menu";
ALTER TABLE "ui_menu_action" RENAME TO "sys_menu_action";
ALTER TABLE "iam_user" RENAME TO "sys_user";
ALTER TABLE "iam_role" RENAME TO "sys_role";
ALTER TABLE "iam_role_user" RENAME TO "sys_role_user";
ALTER TABLE "iam_role_permission" RENAME TO "sys_role_permission";
ALTER TABLE "ui_system_list_view" RENAME TO "sys_system_list_view";
ALTER TABLE "iam_role_list_view" RENAME TO "sys_role_list_view";
ALTER TABLE "ui_user_list_view" RENAME TO "sys_user_list_view";
ALTER TABLE "ui_user_list_view_preference" RENAME TO "sys_user_list_view_preference";

CREATE TABLE "sys_tenant" (
  "id" UUID NOT NULL,
  "tenant_code" VARCHAR(64) NOT NULL,
  "tenant_name" VARCHAR(128) NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_tenant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_tenant_version_check" CHECK ("version" > 0)
);

CREATE TABLE "sys_application" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_code" VARCHAR(64) NOT NULL,
  "application_name" VARCHAR(128) NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_application_version_check" CHECK ("version" > 0),
  CONSTRAINT "sys_application_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "sys_role_group" (
  "id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "group_code" VARCHAR(64) NOT NULL,
  "group_name" VARCHAR(128) NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_role_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_role_group_application_fkey" FOREIGN KEY ("application_id") REFERENCES "sys_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "sys_permission" (
  "id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "permission_code" VARCHAR(160) NOT NULL,
  "permission_name" VARCHAR(128) NOT NULL,
  "resource_code" VARCHAR(128) NOT NULL,
  "action_code" VARCHAR(64) NOT NULL,
  "source" "PermissionSource" NOT NULL DEFAULT 'SYSTEM',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_permission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_permission_application_fkey" FOREIGN KEY ("application_id") REFERENCES "sys_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "sys_audit_log" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action_code" VARCHAR(128) NOT NULL,
  "resource_type" VARCHAR(64) NOT NULL,
  "resource_id" VARCHAR(128),
  "before_snapshot" JSONB,
  "after_snapshot" JSONB,
  "request_id" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sys_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sys_tenant_tenant_code_key" ON "sys_tenant"("tenant_code");
CREATE UNIQUE INDEX "sys_application_tenant_code_key" ON "sys_application"("tenant_id", "application_code");
CREATE UNIQUE INDEX "sys_application_id_tenant_key" ON "sys_application"("id", "tenant_id");
CREATE INDEX "sys_application_code_status_idx" ON "sys_application"("application_code", "status");
CREATE UNIQUE INDEX "sys_role_group_application_code_key" ON "sys_role_group"("application_id", "group_code");
CREATE UNIQUE INDEX "sys_permission_application_code_key" ON "sys_permission"("application_id", "permission_code");
CREATE UNIQUE INDEX "sys_permission_id_application_key" ON "sys_permission"("id", "application_id");
CREATE INDEX "sys_permission_lookup_idx" ON "sys_permission"("application_id", "resource_code", "status");
CREATE INDEX "sys_audit_log_application_time_idx" ON "sys_audit_log"("application_id", "created_at" DESC);
CREATE INDEX "sys_audit_log_actor_time_idx" ON "sys_audit_log"("actor_user_id", "created_at" DESC);

ALTER TABLE "sys_user" ADD COLUMN "user_type" "UserType" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "sys_user" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "sys_role" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "sys_role" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_role" ADD COLUMN "role_group_id" UUID;
ALTER TABLE "sys_menu" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_menu" ADD COLUMN "access_permission_id" UUID;
ALTER TABLE "sys_menu_action" ADD COLUMN "permission_id" UUID;
ALTER TABLE "sys_system_list_view" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_user_list_view" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_user_list_view_preference" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_role_user" ADD COLUMN "id" UUID;
UPDATE "sys_role_user"
SET "id" = (substr(md5("role_id"::text || ':' || "user_id"::text), 1, 8) || '-' ||
            substr(md5("role_id"::text || ':' || "user_id"::text), 9, 4) || '-4' ||
            substr(md5("role_id"::text || ':' || "user_id"::text), 14, 3) || '-8' ||
            substr(md5("role_id"::text || ':' || "user_id"::text), 18, 3) || '-' ||
            substr(md5("role_id"::text || ':' || "user_id"::text), 21, 12))::uuid;
ALTER TABLE "sys_role_user" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "sys_role_user" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "sys_role_user" ADD COLUMN "granted_by" UUID;
ALTER TABLE "sys_role_user" ADD COLUMN "ended_by" UUID;
ALTER TABLE "sys_role_user" ADD COLUMN "ended_at" TIMESTAMPTZ(3);
ALTER TABLE "sys_role_user" DROP CONSTRAINT "iam_role_user_pkey";
ALTER TABLE "sys_role_user" ADD CONSTRAINT "sys_role_user_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "sys_role_user_period_key" ON "sys_role_user"("role_id", "user_id", "effective_at");

-- Resolve every legacy system_code into an explicit tenant/application scope.
INSERT INTO "sys_tenant" ("id", "tenant_code", "tenant_name")
VALUES ('00000000-0000-4000-8000-000000000001', 'default', '默认租户');

INSERT INTO "sys_application" ("id", "tenant_id", "application_code", "application_name")
SELECT (substr(md5('application:' || code), 1, 8) || '-' || substr(md5('application:' || code), 9, 4) || '-4' ||
        substr(md5('application:' || code), 14, 3) || '-8' || substr(md5('application:' || code), 18, 3) || '-' ||
        substr(md5('application:' || code), 21, 12))::uuid,
       '00000000-0000-4000-8000-000000000001', code, code
FROM (
  SELECT DISTINCT "system_code" AS code FROM "sys_menu"
  UNION SELECT DISTINCT "system_code" FROM "sys_role"
  UNION SELECT DISTINCT "system_code" FROM "sys_system_list_view"
) systems;

INSERT INTO "sys_role_group" ("id", "application_id", "group_code", "group_name")
SELECT (substr(md5('role-group:' || "application_code"), 1, 8) || '-' || substr(md5('role-group:' || "application_code"), 9, 4) || '-4' ||
        substr(md5('role-group:' || "application_code"), 14, 3) || '-8' || substr(md5('role-group:' || "application_code"), 18, 3) || '-' ||
        substr(md5('role-group:' || "application_code"), 21, 12))::uuid,
       "id", 'default', '默认角色组'
FROM "sys_application";

UPDATE "sys_user" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "sys_role" r SET "tenant_id" = a."tenant_id", "application_id" = a."id", "role_group_id" = g."id"
FROM "sys_application" a JOIN "sys_role_group" g ON g."application_id" = a."id"
WHERE a."application_code" = r."system_code";
CREATE UNIQUE INDEX "sys_role_id_application_key" ON "sys_role"("id", "application_id");
UPDATE "sys_menu" m SET "application_id" = a."id" FROM "sys_application" a WHERE a."application_code" = m."system_code";
UPDATE "sys_system_list_view" v SET "application_id" = a."id" FROM "sys_application" a WHERE a."application_code" = v."system_code";
UPDATE "sys_user_list_view" v SET "application_id" = a."id" FROM "sys_application" a WHERE a."application_code" = v."system_code";
UPDATE "sys_user_list_view_preference" v SET "application_id" = a."id" FROM "sys_application" a WHERE a."application_code" = v."system_code";

-- Convert legacy navigation/action grants into stable independent permissions.
INSERT INTO "sys_permission" ("id", "application_id", "permission_code", "permission_name", "resource_code", "action_code")
SELECT (substr(md5('permission:' || a."application_code" || ':' || code), 1, 8) || '-' || substr(md5('permission:' || a."application_code" || ':' || code), 9, 4) || '-4' ||
        substr(md5('permission:' || a."application_code" || ':' || code), 14, 3) || '-8' || substr(md5('permission:' || a."application_code" || ':' || code), 18, 3) || '-' ||
        substr(md5('permission:' || a."application_code" || ':' || code), 21, 12))::uuid,
       a."id", code, name, resource_code, action_code
FROM (
  SELECT m."system_code",
         CASE WHEN rp."menu_action_id" IS NULL THEN 'navigation.' || m."menu_code" || '.access'
              ELSE 'menu.' || m."menu_code" || '.' || ma."action_code" END AS code,
         CASE WHEN rp."menu_action_id" IS NULL THEN '访问' || m."menu_name" ELSE ma."action_name" END AS name,
         m."menu_code" AS resource_code,
         COALESCE(ma."action_code", 'access') AS action_code
  FROM "sys_role_permission" rp
  JOIN "sys_menu" m ON m."id" = rp."menu_id"
  LEFT JOIN "sys_menu_action" ma ON ma."id" = rp."menu_action_id"
  GROUP BY m."system_code", m."menu_code", m."menu_name", rp."menu_action_id", ma."action_code", ma."action_name"
) legacy
JOIN "sys_application" a ON a."application_code" = legacy."system_code";

INSERT INTO "sys_permission" ("id", "application_id", "permission_code", "permission_name", "resource_code", "action_code")
SELECT (substr(md5('permission:' || a."application_code" || ':' || p.code), 1, 8) || '-' || substr(md5('permission:' || a."application_code" || ':' || p.code), 9, 4) || '-4' ||
        substr(md5('permission:' || a."application_code" || ':' || p.code), 14, 3) || '-8' || substr(md5('permission:' || a."application_code" || ':' || p.code), 18, 3) || '-' ||
        substr(md5('permission:' || a."application_code" || ':' || p.code), 21, 12))::uuid,
       a."id", p.code, p.name, p.resource, p.action
FROM "sys_application" a
CROSS JOIN (VALUES
  ('access.user.view', '查看用户', 'user', 'view'),
  ('access.user.status.manage', '管理用户状态', 'user', 'status-manage'),
  ('access.role.view', '查看角色', 'role', 'view'),
  ('access.role.create', '创建角色', 'role', 'create'),
  ('access.role.update', '修改角色', 'role', 'update'),
  ('access.role.status.manage', '管理角色状态', 'role', 'status-manage'),
  ('access.role.member.manage', '管理角色成员', 'role-member', 'manage'),
  ('access.role.permission.assign', '分配角色权限', 'role-permission', 'assign'),
  ('access.permission.view', '查看权限目录', 'permission', 'view')
) AS p(code, name, resource, action)
ON CONFLICT ("application_id", "permission_code") DO NOTHING;

UPDATE "sys_menu" m SET "access_permission_id" = p."id"
FROM "sys_permission" p
WHERE p."permission_code" = 'navigation.' || m."menu_code" || '.access'
  AND p."application_id" = m."application_id";
UPDATE "sys_menu_action" ma SET "permission_id" = p."id"
FROM "sys_menu" m, "sys_permission" p
WHERE m."id" = ma."menu_id"
  AND p."application_id" = m."application_id"
  AND p."permission_code" = 'menu.' || m."menu_code" || '.' || ma."action_code";

ALTER TABLE "sys_role_permission" ADD COLUMN "permission_id" UUID;
ALTER TABLE "sys_role_permission" ADD COLUMN "application_id" UUID;
ALTER TABLE "sys_role_permission" ADD COLUMN "granted_by" UUID;
ALTER TABLE "sys_role_permission" ADD COLUMN "revoked_by" UUID;
ALTER TABLE "sys_role_permission" ADD COLUMN "revoked_at" TIMESTAMPTZ(3);
UPDATE "sys_role_permission" rp
SET "permission_id" = p."id", "application_id" = a."id"
FROM "sys_menu" m, "sys_application" a, "sys_permission" p
WHERE m."id" = rp."menu_id"
  AND a."application_code" = rp."system_code"
  AND p."application_id" = a."id"
  AND p."permission_code" = CASE
    WHEN rp."menu_action_id" IS NULL THEN 'navigation.' || m."menu_code" || '.access'
    ELSE 'menu.' || m."menu_code" || '.' || (SELECT ma."action_code" FROM "sys_menu_action" ma WHERE ma."id" = rp."menu_action_id")
  END;
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_permission_fkey" FOREIGN KEY ("permission_id") REFERENCES "sys_permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "sys_role_permission_role_permission_key" ON "sys_role_permission"("role_id", "permission_id");

-- System administrators explicitly receive every active permission in their application.
DROP INDEX IF EXISTS "iam_role_permission_menu_key";
DROP INDEX IF EXISTS "iam_role_permission_action_key";

INSERT INTO "sys_role_permission" ("id", "system_code", "role_id", "menu_id", "permission_type", "permission_id", "application_id", "status", "updated_at")
SELECT (substr(md5('grant:' || r."id"::text || ':' || p."id"::text), 1, 8) || '-' || substr(md5('grant:' || r."id"::text || ':' || p."id"::text), 9, 4) || '-4' ||
        substr(md5('grant:' || r."id"::text || ':' || p."id"::text), 14, 3) || '-8' || substr(md5('grant:' || r."id"::text || ':' || p."id"::text), 18, 3) || '-' ||
        substr(md5('grant:' || r."id"::text || ':' || p."id"::text), 21, 12))::uuid,
       r."system_code", r."id", fallback_menu."id", 'MENU', p."id", r."application_id", 'ACTIVE', CURRENT_TIMESTAMP
FROM "sys_role" r
JOIN "sys_permission" p ON p."application_id" = r."application_id"
JOIN LATERAL (SELECT m."id" FROM "sys_menu" m WHERE m."application_id" = r."application_id" ORDER BY m."sort_no", m."id" LIMIT 1) fallback_menu ON true
WHERE r."is_system" = true
ON CONFLICT ("role_id", "permission_id") DO UPDATE SET "status" = 'ACTIVE', "revoked_at" = NULL, "revoked_by" = NULL;

ALTER TABLE "sys_role_permission" ALTER COLUMN "permission_id" SET NOT NULL;
ALTER TABLE "sys_role_permission" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_role_permission" DROP CONSTRAINT "iam_role_permission_role_id_system_code_fkey";
ALTER TABLE "sys_role_permission" DROP CONSTRAINT "iam_role_permission_menu_id_system_code_fkey";
ALTER TABLE "sys_role_permission" DROP CONSTRAINT "iam_role_permission_menu_action_id_menu_id_fkey";
ALTER TABLE "sys_role_permission" DROP CONSTRAINT "iam_role_permission_shape_check";
DROP INDEX IF EXISTS "iam_role_permission_role_idx";
DROP INDEX IF EXISTS "iam_role_permission_target_idx";
ALTER TABLE "sys_role_permission" DROP COLUMN "system_code";
ALTER TABLE "sys_role_permission" DROP COLUMN "menu_id";
ALTER TABLE "sys_role_permission" DROP COLUMN "permission_type";
ALTER TABLE "sys_role_permission" DROP COLUMN "menu_action_id";
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_role_fkey" FOREIGN KEY ("role_id", "application_id") REFERENCES "sys_role"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sys_role_permission" DROP CONSTRAINT "sys_role_permission_permission_fkey";
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_permission_fkey" FOREIGN KEY ("permission_id", "application_id") REFERENCES "sys_permission"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sys_role_permission_role_idx" ON "sys_role_permission"("role_id", "status");

ALTER TABLE "sys_user" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "sys_role" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "sys_role" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_role" ALTER COLUMN "role_group_id" SET NOT NULL;
ALTER TABLE "sys_menu" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_system_list_view" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_user_list_view" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_user_list_view_preference" ALTER COLUMN "application_id" SET NOT NULL;
