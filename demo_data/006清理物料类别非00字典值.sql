BEGIN;

LOCK TABLE sys_dictionary_item IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_material_category_cleanup ON COMMIT DROP AS
WITH RECURSIVE dict_tree AS (
  SELECT id, parent_id, dict_code, dict_name, 0 AS depth
  FROM sys_dictionary
  WHERE system_code = 'demo-portal' AND dict_name = '物料类别'
  UNION ALL
  SELECT dictionary.id, dictionary.parent_id, dictionary.dict_code, dictionary.dict_name, tree.depth + 1
  FROM sys_dictionary dictionary
  JOIN dict_tree tree ON dictionary.parent_id = tree.id
  WHERE dictionary.system_code = 'demo-portal'
)
SELECT item.id, item.dictionary_id, item.item_value, item.item_name, tree.dict_code, tree.depth
FROM sys_dictionary_item item
JOIN dict_tree tree ON tree.id = item.dictionary_id
WHERE tree.depth > 0
  AND item.item_value NOT LIKE '00%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM demo_material_category_cleanup doomed
    JOIN md_item item
      ON doomed.id IN (item.major_category_id, item.middle_category_id, item.minor_category_id)
  ) THEN
    RAISE EXCEPTION '待删除物料类别仍被物料产品引用';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM sys_dictionary_item child
    JOIN demo_material_category_cleanup parent ON child.parent_item_id = parent.id
    LEFT JOIN demo_material_category_cleanup doomed_child ON doomed_child.id = child.id
    WHERE doomed_child.id IS NULL
  ) THEN
    RAISE EXCEPTION '待删除父级仍有需要保留的 00 开头子级';
  END IF;
END $$;

DELETE FROM sys_dictionary_item item
USING demo_material_category_cleanup doomed
WHERE item.id = doomed.id AND doomed.dict_code = 'material_minor_category';

DELETE FROM sys_dictionary_item item
USING demo_material_category_cleanup doomed
WHERE item.id = doomed.id AND doomed.dict_code = 'material_middle_category';

DELETE FROM sys_dictionary_item item
USING demo_material_category_cleanup doomed
WHERE item.id = doomed.id AND doomed.dict_code = 'material_major_category';

INSERT INTO sys_audit_log (
  id, tenant_id, application_id, actor_user_id, action_code, resource_type,
  resource_id, before_snapshot, after_snapshot, request_id, created_at
)
SELECT
  gen_random_uuid(), application.tenant_id, application.id, NULL,
  'dictionary.material_category_cleanup', 'dictionary', 'material_category',
  jsonb_build_object(
    'rule', 'delete item_value not starting with 00',
    'count', count(*),
    'items', jsonb_agg(jsonb_build_object(
      'dictionaryCode', cleanup.dict_code,
      'itemValue', cleanup.item_value,
      'itemName', cleanup.item_name
    ) ORDER BY cleanup.depth DESC, cleanup.item_value)
  ),
  jsonb_build_object('remainingNon00Count', 0),
  'material-category-non00-cleanup-20261006-v1', now()
FROM demo_material_category_cleanup cleanup
CROSS JOIN sys_application application
WHERE application.application_code = 'demo-portal'
GROUP BY application.id, application.tenant_id;

COMMIT;

