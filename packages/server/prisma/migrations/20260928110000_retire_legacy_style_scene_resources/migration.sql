-- Retire the obsolete scene menu entries. The current template library uses
-- a login-only frontend entry; historical scene records remain untouched.
UPDATE "sys_page_resource" resource
SET "status" = 'DISABLED', "is_auto_add_menu" = false,
    "version" = resource."version" + 1, "updated_at" = CURRENT_TIMESTAMP
FROM "sys_application" application
WHERE application."id" = resource."application_id"
  AND application."application_code" = 'demo-portal'
  AND resource."page_code" IN ('style-scenes', 'style-scene-list')
  AND resource."status" = 'ACTIVE';

UPDATE "sys_menu"
SET "status" = 'DISABLED', "version" = "version" + 1,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "system_code" = 'demo-portal'
  AND "menu_code" IN ('style-scenes', 'style-scene-list')
  AND "status" = 'ACTIVE';
