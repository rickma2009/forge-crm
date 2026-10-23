-- Sales interaction P4-P6. Additive migration; no business data backfill.
CREATE TABLE sd_sales_suggestion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 customer_id uuid,
 opportunity_id uuid,
 subject_key varchar(64) NOT NULL,
 recipient_id uuid NOT NULL,
 rule_code varchar(16) NOT NULL,
 rule_version integer NOT NULL DEFAULT 1,
 cycle_key varchar(64) NOT NULL,
 input_hash varchar(64) NOT NULL,
 title varchar(160) NOT NULL,
 evidence jsonb NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'ACTIVE',
 resume_at timestamptz(3),
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_sales_suggestion_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_sales_suggestion_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_sales_suggestion ADD CONSTRAINT sd_sales_suggestion_customer_fk FOREIGN KEY(customer_id,system_code) REFERENCES crm_customer(id,system_code) ON DELETE RESTRICT;
ALTER TABLE sd_sales_suggestion ADD CONSTRAINT sd_sales_suggestion_opp_fk FOREIGN KEY(opportunity_id,tenant_id,application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sd_sales_suggestion ADD CONSTRAINT sd_sales_suggestion_recipient_id_fk FOREIGN KEY(recipient_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE sd_sales_suggestion ADD CONSTRAINT sd_sales_suggestion_subject_ck CHECK ((customer_id IS NOT NULL)::int+(opportunity_id IS NOT NULL)::int=1 AND subject_key=CASE WHEN customer_id IS NOT NULL THEN 'customer:'||customer_id::text ELSE 'opportunity:'||opportunity_id::text END);
CREATE TABLE sd_score_rule_set (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 rule_version integer NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'DRAFT',
 config jsonb NOT NULL,
 creator_id uuid NOT NULL,
 published_at timestamptz(3),
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_score_rule_set_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_score_rule_set_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_score_rule_set ADD CONSTRAINT sd_score_rule_set_creator_id_fk FOREIGN KEY(creator_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE TABLE sd_opp_score (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 opportunity_id uuid NOT NULL,
 rule_set_id uuid NOT NULL,
 input_hash varchar(64) NOT NULL,
 system_score integer NOT NULL,
 breakdown jsonb NOT NULL,
 input_summary jsonb NOT NULL,
 calculated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_opp_score_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_opp_score_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_opp_score ADD CONSTRAINT sd_opp_score_opp_fk FOREIGN KEY(opportunity_id,tenant_id,application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT;
CREATE TABLE sd_score_override (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 opportunity_id uuid NOT NULL,
 score integer,
 reason varchar(500) NOT NULL,
 operator_id uuid NOT NULL,
 expires_at timestamptz(3) NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'ACTIVE',
 request_id uuid NOT NULL,
 request_hash varchar(64) NOT NULL,
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_score_override_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_score_override_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_score_override ADD CONSTRAINT sd_score_override_opp_fk FOREIGN KEY(opportunity_id,tenant_id,application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sd_score_override ADD CONSTRAINT sd_score_override_operator_id_fk FOREIGN KEY(operator_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE TABLE sd_record_comment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 customer_id uuid,
 opportunity_id uuid,
 subject_key varchar(64) NOT NULL,
 root_comment_id uuid,
 author_id uuid NOT NULL,
 author_name varchar(128) NOT NULL,
 body varchar(4000) NOT NULL DEFAULT '',
 state varchar(16) NOT NULL DEFAULT 'DRAFT',
 version integer NOT NULL DEFAULT 1,
 request_id uuid NOT NULL,
 request_hash varchar(64) NOT NULL,
 published_at timestamptz(3),
 expires_at timestamptz(3) NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_record_comment_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_record_comment_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_record_comment_customer_fk FOREIGN KEY(customer_id,system_code) REFERENCES crm_customer(id,system_code) ON DELETE RESTRICT;
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_record_comment_opp_fk FOREIGN KEY(opportunity_id,tenant_id,application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_record_comment_author_id_fk FOREIGN KEY(author_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_record_comment_subject_ck CHECK ((customer_id IS NOT NULL)::int+(opportunity_id IS NOT NULL)::int=1 AND subject_key=CASE WHEN customer_id IS NOT NULL THEN 'customer:'||customer_id::text ELSE 'opportunity:'||opportunity_id::text END);
CREATE TABLE sd_comment_revision (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 comment_id uuid NOT NULL,
 version integer NOT NULL,
 body varchar(4000) NOT NULL,
 state varchar(16) NOT NULL,
 reason varchar(500) NOT NULL,
 operator_id uuid NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_comment_revision_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_comment_revision_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_comment_revision ADD CONSTRAINT sd_comment_revision_operator_id_fk FOREIGN KEY(operator_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE TABLE sd_comment_mention (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 comment_id uuid NOT NULL,
 user_id uuid NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_comment_mention_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sd_comment_mention_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sd_comment_mention ADD CONSTRAINT sd_comment_mention_user_id_fk FOREIGN KEY(user_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE TABLE sys_event_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 comment_id uuid NOT NULL,
 recipient_id uuid NOT NULL,
 event_key varchar(128) NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'PENDING',
 attempts integer NOT NULL DEFAULT 0,
 next_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sys_event_outbox_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sys_event_outbox_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sys_event_outbox ADD CONSTRAINT sys_event_outbox_recipient_id_fk FOREIGN KEY(recipient_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE TABLE sys_notification (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 application_id uuid NOT NULL,
 system_code varchar(64) NOT NULL,
 outbox_id uuid NOT NULL,
 comment_id uuid NOT NULL,
 recipient_id uuid NOT NULL,
 read_at timestamptz(3),
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sys_notification_scope_key UNIQUE(id,tenant_id,application_id),
 CONSTRAINT sys_notification_app_fk FOREIGN KEY(application_id,tenant_id,system_code) REFERENCES sys_application(id,tenant_id,application_code) ON DELETE RESTRICT
);
ALTER TABLE sys_notification ADD CONSTRAINT sys_notification_recipient_id_fk FOREIGN KEY(recipient_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX sd_suggestion_cycle_key ON sd_sales_suggestion(application_id,recipient_id,subject_key,rule_code,cycle_key);
CREATE INDEX sd_suggestion_record_idx ON sd_sales_suggestion(application_id,recipient_id,subject_key,created_at);
CREATE UNIQUE INDEX sd_score_rule_version_key ON sd_score_rule_set(application_id,rule_version);
CREATE UNIQUE INDEX sd_score_input_key ON sd_opp_score(opportunity_id,rule_set_id,input_hash);
CREATE INDEX sd_score_history_idx ON sd_opp_score(application_id,opportunity_id,calculated_at);
CREATE UNIQUE INDEX sd_score_override_request_key ON sd_score_override(application_id,operator_id,request_id);
CREATE INDEX sd_override_history_idx ON sd_score_override(application_id,opportunity_id,created_at);
CREATE UNIQUE INDEX sd_comment_subject_key ON sd_record_comment(id,tenant_id,application_id,subject_key);
CREATE UNIQUE INDEX sd_comment_request_key ON sd_record_comment(application_id,author_id,request_id);
CREATE INDEX sd_comment_record_idx ON sd_record_comment(application_id,subject_key,root_comment_id,created_at);
CREATE UNIQUE INDEX sd_comment_revision_key ON sd_comment_revision(comment_id,version);
CREATE UNIQUE INDEX sd_comment_mention_key ON sd_comment_mention(comment_id,user_id);
CREATE UNIQUE INDEX sys_outbox_event_key ON sys_event_outbox(application_id,event_key);
CREATE INDEX sys_outbox_pending_idx ON sys_event_outbox(state,next_at);
CREATE UNIQUE INDEX sys_notification_event_key ON sys_notification(outbox_id);
CREATE INDEX sys_notification_owner_idx ON sys_notification(application_id,recipient_id,read_at,created_at);
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_comment_root_fk FOREIGN KEY(root_comment_id,tenant_id,application_id,subject_key) REFERENCES sd_record_comment(id,tenant_id,application_id,subject_key) ON DELETE RESTRICT;
ALTER TABLE sd_record_comment ADD CONSTRAINT sd_comment_state_ck CHECK(state IN ('DRAFT','PUBLISHED','WITHDRAWN','HIDDEN','EXPIRED') AND version>0 AND (root_comment_id IS NULL OR root_comment_id<>id));
ALTER TABLE sd_sales_suggestion ADD CONSTRAINT sd_suggestion_state_ck CHECK(state IN ('ACTIVE','ADOPTED','IGNORED','SNOOZED','EXPIRED') AND version>0 AND rule_code IN ('R01','R02','R03'));
ALTER TABLE sd_score_rule_set ADD CONSTRAINT sd_score_rule_state_ck CHECK(state IN ('DRAFT','PUBLISHED','DISABLED') AND version>0);
CREATE UNIQUE INDEX sd_score_rule_active_key ON sd_score_rule_set(application_id) WHERE state='PUBLISHED';
ALTER TABLE sd_score_override ADD CONSTRAINT sd_override_values_ck CHECK ((score IS NULL OR score BETWEEN 0 AND 100) AND state IN ('ACTIVE','RESTORED','EXPIRED') AND version>0);
CREATE UNIQUE INDEX sd_override_active_key ON sd_score_override(application_id,opportunity_id) WHERE state='ACTIVE';
ALTER TABLE sd_opp_score ADD CONSTRAINT sd_score_values_ck CHECK(system_score BETWEEN 0 AND 100);
ALTER TABLE sd_opp_score ADD CONSTRAINT sd_score_rule_fk FOREIGN KEY(rule_set_id,tenant_id,application_id) REFERENCES sd_score_rule_set(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_event_outbox ADD CONSTRAINT sys_outbox_state_ck CHECK(state IN ('PENDING','DELIVERED') AND attempts>=0);
ALTER TABLE sd_comment_revision ADD CONSTRAINT sd_comment_revision_comment_fk FOREIGN KEY(comment_id,tenant_id,application_id) REFERENCES sd_record_comment(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sd_comment_mention ADD CONSTRAINT sd_comment_mention_comment_fk FOREIGN KEY(comment_id,tenant_id,application_id) REFERENCES sd_record_comment(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_event_outbox ADD CONSTRAINT sys_event_outbox_comment_fk FOREIGN KEY(comment_id,tenant_id,application_id) REFERENCES sd_record_comment(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_notification ADD CONSTRAINT sys_notification_comment_fk FOREIGN KEY(comment_id,tenant_id,application_id) REFERENCES sd_record_comment(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_notification ADD CONSTRAINT sys_notification_outbox_fk FOREIGN KEY(outbox_id,tenant_id,application_id) REFERENCES sys_event_outbox(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sd_opp ADD COLUMN currency_code varchar(3);
ALTER TABLE sd_opp ADD CONSTRAINT sd_opp_currency_ck CHECK(currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$');
ALTER TABLE sys_personal_todo ADD COLUMN source_suggestion_id uuid, ADD COLUMN result varchar(2000) NOT NULL DEFAULT '', ADD COLUMN version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX sys_todo_suggestion_key ON sys_personal_todo(source_suggestion_id);
ALTER TABLE sys_personal_todo ADD CONSTRAINT sys_todo_suggestion_fk FOREIGN KEY(source_suggestion_id,tenant_id,application_id) REFERENCES sd_sales_suggestion(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_attachment DROP CONSTRAINT IF EXISTS sys_attach_values_ck;
ALTER TABLE sys_attachment ADD CONSTRAINT sys_attach_values_ck CHECK (owner_type IN ('PRODUCT','SALES_ACTIVITY','OPPORTUNITY_FOLLOW_UP','RECORD_COMMENT') AND attachment_type IN ('PDF','EXCEL','IMAGE','OTHER') AND status IN ('ACTIVE','DELETE_PENDING','DELETE_FAILED') AND file_size>0 AND version>0);

ALTER TABLE sys_personal_todo DROP CONSTRAINT IF EXISTS sys_todo_status_chk;
ALTER TABLE sys_personal_todo ADD CONSTRAINT sys_todo_status_chk CHECK(status IN ('OPEN','DONE','CANCELLED') AND (source_suggestion_id IS NULL OR status='OPEN' OR length(trim(result))>0));
