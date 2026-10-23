CREATE TABLE sys_code_rule (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, application_id uuid NOT NULL,
 object_code varchar(40) NOT NULL, object_name varchar(80) NOT NULL, sort_no integer NOT NULL DEFAULT 0,
 has_prefix boolean NOT NULL DEFAULT true, prefix varchar(12) NOT NULL DEFAULT '',
 has_date boolean NOT NULL DEFAULT false, date_type varchar(8) NOT NULL DEFAULT 'NONE', digits integer NOT NULL,
 start_number bigint NOT NULL DEFAULT 1, status varchar(16) NOT NULL DEFAULT 'ACTIVE', version integer NOT NULL DEFAULT 1,
 deleted_at timestamptz(3), created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(3) NOT NULL,
 CONSTRAINT sys_code_rule_app_object_key UNIQUE(application_id, object_code),
 CONSTRAINT sys_code_rule_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sys_code_rule_app_fk FOREIGN KEY(application_id,tenant_id) REFERENCES sys_application(id,tenant_id) ON DELETE RESTRICT,
 CONSTRAINT sys_code_rule_fields_ck CHECK (object_code ~ '^[A-Z][A-Z0-9_]{0,39}$' AND length(trim(object_name))>0 AND sort_no>=0 AND digits BETWEEN 1 AND 12 AND start_number BETWEEN 1 AND 999999999999 AND start_number < power(10::numeric,digits) AND version>0 AND status IN ('ACTIVE','DISABLED') AND ((has_prefix AND prefix ~ '^[A-Za-z0-9]{1,12}$') OR (NOT has_prefix AND prefix='')) AND ((has_date AND date_type IN ('YEAR','MONTH','DAY')) OR (NOT has_date AND date_type='NONE')))
);
CREATE TABLE sys_code_counter (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES sys_tenant(id) ON DELETE RESTRICT, object_code varchar(40) NOT NULL,
 namespace varchar(24) NOT NULL, current_value bigint NOT NULL CHECK(current_value>=0), updated_at timestamptz(3) NOT NULL,
 CONSTRAINT sys_code_counter_namespace_key UNIQUE(tenant_id,object_code,namespace)
);
CREATE TABLE sys_code_issue (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, application_id uuid NOT NULL, rule_id uuid NOT NULL,
 object_code varchar(40) NOT NULL, request_id uuid NOT NULL, code varchar(40) NOT NULL, rule_version integer NOT NULL CHECK(rule_version>0), created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sys_code_issue_number_key UNIQUE(tenant_id,object_code,code),
 CONSTRAINT sys_code_issue_request_key UNIQUE(application_id,object_code,request_id),
 CONSTRAINT sys_code_issue_rule_fk FOREIGN KEY(rule_id,tenant_id,application_id) REFERENCES sys_code_rule(id,tenant_id,application_id) ON DELETE RESTRICT
);
CREATE INDEX sys_code_issue_rule_idx ON sys_code_issue(rule_id);
