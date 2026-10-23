ALTER TABLE org_unit
  ADD COLUMN is_sales_org boolean NOT NULL DEFAULT false,
  ADD COLUMN is_rd_org boolean NOT NULL DEFAULT false,
  ADD COLUMN is_platform_org boolean NOT NULL DEFAULT false,
  ADD COLUMN manager_employee_id uuid;

ALTER TABLE org_unit
  ADD CONSTRAINT org_unit_manager_employee_fk
  FOREIGN KEY (manager_employee_id, tenant_id)
  REFERENCES org_employee(id, tenant_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX org_unit_sales_lookup_idx ON org_unit(tenant_id, is_sales_org, status);
CREATE INDEX org_unit_manager_employee_idx ON org_unit(manager_employee_id);

ALTER TABLE org_employee ADD COLUMN job_title_value varchar(64);

-- Existing demonstration units receive a one-time classification. Subsequent edits belong to users.
UPDATE org_unit SET
  is_sales_org = unit_code IN ('tv-division', 'tv-sales-one', 'tv-sales-two', 'tv-sales-admin'),
  is_rd_org = unit_code IN ('tv-rd-center'),
  is_platform_org = unit_code IN ('component-bg', 'finance-dept', 'supply-chain-dept')
WHERE unit_code IN ('component-bg', 'tv-division', 'tv-sales-one', 'tv-sales-two', 'tv-sales-admin', 'tv-rd-center', 'finance-dept', 'supply-chain-dept');

UPDATE org_employee AS employee SET job_title_value = CASE
  WHEN position.position_code IN ('bg-manager', 'division-manager') THEN 'DIRECTOR'
  WHEN position.position_code IN ('department-manager', 'sales-manager', 'rd-manager', 'finance-manager', 'supply-manager') THEN 'MANAGER'
  WHEN position.position_code = 'rd-engineer' THEN 'ENGINEER'
  ELSE 'SPECIALIST'
END
FROM org_employee_assignment AS assignment
JOIN org_position AS position ON position.id = assignment.position_id AND position.tenant_id = assignment.tenant_id
WHERE assignment.employee_id = employee.id AND assignment.tenant_id = employee.tenant_id
  AND assignment.is_primary = true AND assignment.status = 'ACTIVE' AND assignment.expires_at IS NULL
  AND employee.job_title_value IS NULL;
