-- Approved one-time cleanup for obsolete demo-portal resource-menu records.
-- Runtime deletion remains soft-disable; only the explicitly listed legacy rows are purged.
CREATE TEMP TABLE "obsolete_page_resource" ON COMMIT DROP AS
SELECT resource."id"
FROM "sys_page_resource" resource
JOIN "sys_application" application ON application."id" = resource."application_id"
WHERE application."application_code" = 'demo-portal'
  AND resource."status" = 'DISABLED'
  AND resource."page_type" <> 'SYSTEM'
  AND resource."page_code" IN (
    'business-demo',
    'components',
    'foundations',
    'templates',
    'component-actions',
    'component-data',
    'component-feedback',
    'component-forms',
    'foundation-colors',
    'foundation-icons',
    'foundation-spacing',
    'foundation-typography',
    'interaction-patterns',
    'overview',
    'page-states',
    'scenarios',
    'template-detail',
    'template-filter',
    'template-form',
    'template-list',
    'template-master-detail',
    'template-workbench'
  );

CREATE TEMP TABLE "obsolete_menu" ON COMMIT DROP AS
SELECT menu."id"
FROM "sys_menu" menu
WHERE menu."system_code" = 'demo-portal'
  AND menu."status" = 'DISABLED'
  AND menu."page_resource_id" IN (SELECT "id" FROM "obsolete_page_resource");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "sys_page_resource" child
    WHERE child."status" = 'ACTIVE'
      AND child."parent_id" IN (SELECT "id" FROM "obsolete_page_resource")
  ) THEN
    RAISE EXCEPTION 'Cannot remove disabled page resources with active children';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "sys_menu" child
    WHERE child."status" = 'ACTIVE'
      AND child."parent_id" IN (SELECT "id" FROM "obsolete_menu")
  ) THEN
    RAISE EXCEPTION 'Cannot remove disabled menus with active children';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "sys_menu" menu
    WHERE menu."page_resource_id" IN (SELECT "id" FROM "obsolete_page_resource")
      AND menu."id" NOT IN (SELECT "id" FROM "obsolete_menu")
  ) THEN
    RAISE EXCEPTION 'Cannot remove a page resource referenced by a retained menu';
  END IF;
END $$;

CREATE TEMP TABLE "obsolete_permission" ON COMMIT DROP AS
SELECT menu."access_permission_id" AS "id"
FROM "sys_menu" menu
WHERE menu."id" IN (SELECT "id" FROM "obsolete_menu")
  AND menu."access_permission_id" IS NOT NULL
UNION
SELECT action."permission_id" AS "id"
FROM "sys_menu_action" action
WHERE action."menu_id" IN (SELECT "id" FROM "obsolete_menu")
  AND action."permission_id" IS NOT NULL;

DELETE FROM "sys_page_tab"
WHERE "page_id" IN (SELECT "id" FROM "obsolete_page_resource")
   OR "target_page_id" IN (SELECT "id" FROM "obsolete_page_resource");

DELETE FROM "sys_page_button"
WHERE "page_id" IN (SELECT "id" FROM "obsolete_page_resource");

DELETE FROM "sys_role_permission"
WHERE "permission_id" IN (SELECT "id" FROM "obsolete_permission");

DELETE FROM "sys_menu_action"
WHERE "menu_id" IN (SELECT "id" FROM "obsolete_menu");

DELETE FROM "sys_menu"
WHERE "id" IN (SELECT "id" FROM "obsolete_menu");

DELETE FROM "sys_permission" permission
WHERE permission."id" IN (SELECT "id" FROM "obsolete_permission")
  AND NOT EXISTS (SELECT 1 FROM "sys_role_permission" grant_row WHERE grant_row."permission_id" = permission."id")
  AND NOT EXISTS (SELECT 1 FROM "sys_menu" menu WHERE menu."access_permission_id" = permission."id")
  AND NOT EXISTS (SELECT 1 FROM "sys_menu_action" action WHERE action."permission_id" = permission."id");

DELETE FROM "sys_page_resource"
WHERE "id" IN (SELECT "id" FROM "obsolete_page_resource");
