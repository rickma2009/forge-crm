-- Nullable by design: existing items are preserved without guessed classifications.
ALTER TABLE "md_item"
  ADD COLUMN "item_source" VARCHAR(32),
  ADD COLUMN "item_lifecycle" VARCHAR(32);

-- Add the new fields to existing object views without replacing user column choices.
UPDATE "sys_system_list_view" v
SET "config" = jsonb_set(v."config", '{columns}', (v."config"->'columns') || jsonb_build_array(jsonb_build_object('key', 'itemSource', 'visible', true, 'queryVisible', false, 'queryCollapsed', false, 'width', 160, 'fixed', null))), "version" = "version" + 1, "updated_at" = now()
WHERE v."page_code" = 'item-directory'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v."config"->'columns') c WHERE c->>'key' = 'itemSource');
UPDATE "sys_system_list_view" v
SET "config" = jsonb_set(v."config", '{columns}', (v."config"->'columns') || jsonb_build_array(jsonb_build_object('key', 'itemLifecycle', 'visible', true, 'queryVisible', false, 'queryCollapsed', false, 'width', 160, 'fixed', null))), "version" = "version" + 1, "updated_at" = now()
WHERE v."page_code" = 'item-directory'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v."config"->'columns') c WHERE c->>'key' = 'itemLifecycle');
UPDATE "sys_user_list_view" v
SET "config" = jsonb_set(v."config", '{columns}', (v."config"->'columns') || jsonb_build_array(jsonb_build_object('key', 'itemSource', 'visible', true, 'queryVisible', false, 'queryCollapsed', false, 'width', 160, 'fixed', null))), "version" = "version" + 1, "updated_at" = now()
WHERE v."page_code" = 'item-directory'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v."config"->'columns') c WHERE c->>'key' = 'itemSource');
UPDATE "sys_user_list_view" v
SET "config" = jsonb_set(v."config", '{columns}', (v."config"->'columns') || jsonb_build_array(jsonb_build_object('key', 'itemLifecycle', 'visible', true, 'queryVisible', false, 'queryCollapsed', false, 'width', 160, 'fixed', null))), "version" = "version" + 1, "updated_at" = now()
WHERE v."page_code" = 'item-directory'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v."config"->'columns') c WHERE c->>'key' = 'itemLifecycle');
