-- Upgrade the previous ID-valued presets to manually entered business codes.
-- Unknown text is preserved; no runtime format or existence constraint is added.
WITH desired AS (
  SELECT p.id, p.parameter_value AS old_value, p.usage_note AS old_note, p.version AS old_version,
    CASE p.parameter_code
      WHEN 'DEFAULT_LEGAL_ENTITY' THEN COALESCE((SELECT e.entity_code FROM org_legal_entity e WHERE e.tenant_id = p.tenant_id AND e.entity_id::text = p.parameter_value), p.parameter_value)
      WHEN 'DEFAULT_WAREHOUSE' THEN COALESCE((SELECT w.warehouse_code FROM scm_warehouse w WHERE w.tenant_id = p.tenant_id AND w.warehouse_id::text = p.parameter_value), p.parameter_value)
    END AS new_value,
    CASE p.parameter_code
      WHEN 'DEFAULT_LEGAL_ENTITY' THEN '手工填写默认法人编码；保存时不校验，调用时找不到可用法人则无默认值。'
      WHEN 'DEFAULT_WAREHOUSE' THEN '手工填写默认仓库编码；保存时不校验，调用时按默认法人查找可用仓库，找不到则无默认值。'
    END AS new_note
  FROM sys_parameter p WHERE p.parameter_code IN ('DEFAULT_LEGAL_ENTITY', 'DEFAULT_WAREHOUSE')
), changed AS (
  UPDATE sys_parameter p SET parameter_value = d.new_value, usage_note = d.new_note,
    version = p.version + 1, updated_by = 'parameter-text-upgrade', updated_at = now()
  FROM desired d WHERE p.id = d.id AND (p.parameter_value IS DISTINCT FROM d.new_value OR p.usage_note IS DISTINCT FROM d.new_note)
  RETURNING p.*, d.old_value, d.old_note, d.old_version
)
INSERT INTO sys_audit_log (id, tenant_id, application_id, action_code, resource_type, resource_id, before_snapshot, after_snapshot, request_id)
SELECT gen_random_uuid(), tenant_id, application_id, 'system-parameters.upgrade-text', 'system-parameter', id::text,
  jsonb_build_object('value', old_value, 'usageNote', old_note, 'version', old_version),
  jsonb_build_object('value', parameter_value, 'usageNote', usage_note, 'version', version),
  'parameter-text-values-v1' FROM changed;
