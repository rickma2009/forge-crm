CREATE TABLE sys_de_scene_workspace (
 id UUID PRIMARY KEY, tenant_id UUID NOT NULL, application_id UUID NOT NULL,
 scenario_code VARCHAR(32) NOT NULL CHECK (scenario_code IN ('SCN-PO','SCN-RMA','SCN-BI')),
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 created_by UUID NOT NULL, updated_by UUID NOT NULL,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT sys_de_scene_app_fk FOREIGN KEY(application_id,tenant_id) REFERENCES sys_application(id,tenant_id) ON DELETE RESTRICT,
 CONSTRAINT sys_de_scene_creator_fk FOREIGN KEY(created_by,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT,
 CONSTRAINT sys_de_scene_updater_fk FOREIGN KEY(updated_by,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX sys_de_scene_app_code_key ON sys_de_scene_workspace(application_id,scenario_code);
