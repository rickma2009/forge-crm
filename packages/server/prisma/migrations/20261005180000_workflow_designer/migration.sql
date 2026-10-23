ALTER TABLE sys_wf_config
  ADD COLUMN workflow_code varchar(48),
  ADD COLUMN workflow_name varchar(80),
  ADD COLUMN object_code varchar(40),
  ADD COLUMN updated_at timestamptz(3) NOT NULL DEFAULT now(),
  ADD COLUMN version integer NOT NULL DEFAULT 1;

UPDATE sys_wf_config
SET workflow_code = 'sales_order', workflow_name = '销售订单审批', object_code = 'sales_order'
WHERE workflow_code IS NULL;

ALTER TABLE sys_wf_config
  ALTER COLUMN workflow_code SET NOT NULL,
  ALTER COLUMN workflow_name SET NOT NULL,
  ALTER COLUMN object_code SET NOT NULL;

ALTER TABLE sys_wf_config DROP CONSTRAINT IF EXISTS sys_wf_config_application_id_revision_key;
DROP INDEX IF EXISTS sys_wf_enabled_config_key;

CREATE UNIQUE INDEX sys_wf_cfg_code_rev_key ON sys_wf_config(application_id, workflow_code, revision);
CREATE UNIQUE INDEX sys_wf_enabled_object_key ON sys_wf_config(application_id, object_code) WHERE enabled;
CREATE INDEX sys_wf_cfg_list_idx ON sys_wf_config(application_id, object_code, status, created_at DESC);
