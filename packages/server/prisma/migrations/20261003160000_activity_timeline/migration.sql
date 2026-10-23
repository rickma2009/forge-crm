ALTER TABLE sd_opp_follow_up ADD COLUMN request_id uuid, ADD COLUMN request_hash varchar(64), ADD COLUMN activity_title varchar(120), ADD COLUMN activity_next_step varchar(1000);
CREATE UNIQUE INDEX sd_follow_up_request_key ON sd_opp_follow_up(request_id);
CREATE UNIQUE INDEX sd_activity_customer_scope_key ON crm_customer(id,system_code);
CREATE UNIQUE INDEX sd_activity_app_scope_key ON sys_application(id,tenant_id,application_code);
CREATE TABLE sd_sales_activity (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, application_id uuid NOT NULL, system_code varchar(64) NOT NULL,
 customer_id uuid NOT NULL, opportunity_id uuid, type varchar(16) NOT NULL CHECK (type IN ('VISIT','CALL','EMAIL','FOLLOW_UP','NOTE')),
 title varchar(120) NOT NULL, content varchar(1000) NOT NULL, result varchar(2000) NOT NULL DEFAULT '', next_step varchar(1000) NOT NULL DEFAULT '',
 occurred_at timestamptz(3) NOT NULL, creator_id uuid NOT NULL, creator_name varchar(128) NOT NULL,
 status "RecordStatus" NOT NULL DEFAULT 'ACTIVE', version integer NOT NULL DEFAULT 1 CHECK(version>0),
 request_id uuid NOT NULL, request_hash varchar(64) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(3) NOT NULL,
 CONSTRAINT sd_activity_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT,
 CONSTRAINT sd_activity_customer_fk FOREIGN KEY(customer_id,system_code) REFERENCES crm_customer(id,system_code) ON DELETE RESTRICT,
 CONSTRAINT sd_activity_opp_fk FOREIGN KEY(opportunity_id,tenant_id,application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT,
 CONSTRAINT sd_activity_creator_fk FOREIGN KEY(creator_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX sd_activity_request_key ON sd_sales_activity(application_id,creator_id,request_id);
CREATE INDEX sd_activity_customer_idx ON sd_sales_activity(application_id,customer_id,occurred_at DESC,id);
CREATE INDEX sd_activity_opp_idx ON sd_sales_activity(application_id,opportunity_id,occurred_at DESC,id);

ALTER TABLE sys_attachment DROP CONSTRAINT IF EXISTS sys_attach_values_ck;
ALTER TABLE sys_attachment ADD CONSTRAINT sys_attach_values_ck CHECK (file_size > 0 AND version > 0 AND owner_type IN ('PRODUCT','SALES_ACTIVITY','OPPORTUNITY_FOLLOW_UP') AND attachment_type IN ('PDF','EXCEL','IMAGE','OTHER') AND status IN ('ACTIVE','DELETE_PENDING','DELETE_FAILED'));
