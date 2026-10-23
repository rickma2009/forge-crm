CREATE TABLE agent_task (
 id UUID PRIMARY KEY, application_id UUID NOT NULL, tenant_id UUID NOT NULL,
 system_code VARCHAR(64) NOT NULL, context_type VARCHAR(32) NOT NULL, context_id UUID NOT NULL,
 agent_code VARCHAR(64) NOT NULL, created_by UUID NOT NULL, request_id UUID NOT NULL,
 mode VARCHAR(32) NOT NULL, instruction VARCHAR(2000) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
 snapshot JSONB NOT NULL, steps JSONB NOT NULL, provider VARCHAR(32) NOT NULL, model VARCHAR(128) NOT NULL,
 result JSONB, confirmed_result JSONB, plan JSONB, follow_up_id UUID UNIQUE, usage JSONB, error VARCHAR(500),
 started_at TIMESTAMPTZ(3), finished_at TIMESTAMPTZ(3), created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT agent_task_status_ck CHECK(status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
 CONSTRAINT agent_task_mode_ck CHECK(mode IN ('FOLLOW_UP','COMMUNICATION_PLAN')),
 CONSTRAINT agent_task_scope_fk FOREIGN KEY(application_id,tenant_id) REFERENCES sys_application(id,tenant_id) ON DELETE RESTRICT,
 CONSTRAINT agent_task_actor_fk FOREIGN KEY(created_by,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT,
 CONSTRAINT agent_task_follow_up_fk FOREIGN KEY(follow_up_id) REFERENCES sd_opp_follow_up(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX agent_task_application_id_created_by_request_id_key ON agent_task(application_id,created_by,request_id);
CREATE INDEX agent_task_application_id_context_type_context_id_created_at_idx ON agent_task(application_id,context_type,context_id,created_at);
CREATE INDEX agent_task_status_created_at_idx ON agent_task(status,created_at);
