CREATE UNIQUE INDEX sd_opp_scope_key ON sd_opp(id, tenant_id, application_id);
CREATE INDEX sd_opp_board_idx ON sd_opp(application_id, template_id, stage_id, id);
CREATE TABLE sd_opp_stage_event (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, application_id uuid NOT NULL, opportunity_id uuid NOT NULL,
 from_stage_id uuid NOT NULL, to_stage_id uuid NOT NULL,
 from_stage_name varchar(128) NOT NULL, to_stage_name varchar(128) NOT NULL,
 reason varchar(500) NOT NULL CHECK (length(trim(reason)) > 0), source varchar(32) NOT NULL,
 actor varchar(128) NOT NULL, request_id uuid NOT NULL, payload_hash varchar(64) NOT NULL,
 opportunity_version integer NOT NULL CHECK (opportunity_version > 0), created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sd_opp_stage_event_scope_fk FOREIGN KEY (opportunity_id, tenant_id, application_id) REFERENCES sd_opp(id,tenant_id,application_id) ON DELETE RESTRICT,
 CONSTRAINT sd_opp_stage_event_changed CHECK (from_stage_id <> to_stage_id)
);
CREATE UNIQUE INDEX sd_opp_stage_event_request_key ON sd_opp_stage_event(application_id,request_id);
CREATE INDEX sd_opp_stage_event_record_idx ON sd_opp_stage_event(application_id,opportunity_id,created_at);
