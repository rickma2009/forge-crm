CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE sd_product_price RENAME COLUMN standard_price TO unit_price;
ALTER TABLE sd_product_price ADD COLUMN pricing_type VARCHAR(16) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE sd_product_price ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'CNY';
ALTER TABLE sd_product_price ADD COLUMN effective_date DATE;
ALTER TABLE sd_product_price ADD COLUMN expires_date DATE;
ALTER TABLE sd_product_price ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE sd_product_price ADD COLUMN remark VARCHAR(1000);
ALTER TABLE sd_product_price ADD COLUMN updated_by UUID;
ALTER TABLE sd_product_price ADD COLUMN updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sd_product_price ALTER COLUMN unit_price DROP NOT NULL;

WITH ranked AS (
  SELECT id, product_id, created_at,
         row_number() OVER (PARTITION BY product_id ORDER BY version DESC) AS rn,
         min(created_at::date) OVER (PARTITION BY product_id) AS first_date
  FROM sd_product_price
)
UPDATE sd_product_price p SET
  pricing_type = CASE WHEN EXISTS (SELECT 1 FROM sd_price_tier t WHERE t.price_id=p.id) THEN 'TIERED' ELSE 'STANDARD' END,
  unit_price = CASE WHEN EXISTS (SELECT 1 FROM sd_price_tier t WHERE t.price_id=p.id) THEN NULL ELSE p.unit_price END,
  effective_date = r.first_date,
  status = CASE WHEN r.rn=1 THEN 'ACTIVE' ELSE 'SUPERSEDED' END,
  updated_by = p.created_by,
  updated_at = p.created_at
FROM ranked r WHERE r.id=p.id;

ALTER TABLE sd_product_price ALTER COLUMN effective_date SET NOT NULL;
ALTER TABLE sd_product_price ALTER COLUMN updated_by SET NOT NULL;
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_type_value_ck CHECK ((pricing_type='STANDARD' AND unit_price IS NOT NULL) OR (pricing_type='TIERED' AND unit_price IS NULL));
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_period_ck CHECK (expires_date IS NULL OR expires_date >= effective_date);
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_status_ck CHECK (status IN ('ACTIVE','SUPERSEDED','VOID'));
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_period_excl EXCLUDE USING gist (tenant_id WITH =, product_id WITH =, currency_code WITH =, daterange(effective_date, COALESCE(expires_date + 1, 'infinity'::date), '[)') WITH &&) WHERE (status='ACTIVE');

CREATE UNIQUE INDEX IF NOT EXISTS md_product_attach_scope_key ON md_product(id, tenant_id);
ALTER TABLE sd_quotation_line ADD CONSTRAINT sd_quote_line_product_fk FOREIGN KEY(product_id, tenant_id) REFERENCES md_product(id, tenant_id) ON DELETE RESTRICT;

CREATE TABLE sys_attachment (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, application_id UUID NOT NULL,
  owner_type VARCHAR(32) NOT NULL, owner_id UUID NOT NULL, original_name VARCHAR(255) NOT NULL,
  attachment_type VARCHAR(16) NOT NULL, mime_type VARCHAR(128) NOT NULL, file_size BIGINT NOT NULL,
  storage_key VARCHAR(512) NOT NULL, description VARCHAR(1000), file_version VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL, updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sys_attach_values_ck CHECK (file_size > 0 AND version > 0 AND owner_type IN ('PRODUCT') AND attachment_type IN ('PDF','EXCEL','IMAGE','OTHER') AND status IN ('ACTIVE','DELETE_PENDING','DELETE_FAILED')),
  CONSTRAINT sys_attach_app_fk FOREIGN KEY(application_id, tenant_id) REFERENCES sys_application(id, tenant_id) ON DELETE RESTRICT,
  CONSTRAINT sys_attach_creator_fk FOREIGN KEY(created_by, tenant_id) REFERENCES sys_user(id, tenant_id) ON DELETE RESTRICT,
  CONSTRAINT sys_attach_updater_fk FOREIGN KEY(updated_by, tenant_id) REFERENCES sys_user(id, tenant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX sys_attach_app_storage_key ON sys_attachment(application_id, storage_key);
CREATE INDEX sys_attach_owner_idx ON sys_attachment(application_id, owner_type, owner_id, status, created_at);
