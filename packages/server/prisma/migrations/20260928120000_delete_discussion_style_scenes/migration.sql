-- User requested removal of the obsolete discussion catalog.
-- Current TPL templates and other systems are outside the cleanup scope.
DELETE FROM "style_scene"
WHERE "system_code" = 'demo-portal'
  AND ("asset_code" IS NULL OR "asset_code" NOT LIKE 'TPL-%')
  AND "template_json" IS NULL;
