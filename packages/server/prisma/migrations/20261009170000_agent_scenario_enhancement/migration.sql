-- Compatible: existing single drafts become index 0; no business data is deleted.
ALTER TABLE sys_personal_todo ADD COLUMN draft_index INTEGER NOT NULL DEFAULT 0;
DROP INDEX sys_todo_source_msg_key;
CREATE UNIQUE INDEX sys_todo_source_draft_key ON sys_personal_todo(source_message_id, draft_index);
ALTER TABLE sys_personal_todo ADD CONSTRAINT sys_todo_draft_index_chk CHECK (draft_index >= 0 AND draft_index < 12);
CREATE TABLE sys_agent_knowledge (
 id UUID PRIMARY KEY, document_id UUID NOT NULL, tenant_id UUID NOT NULL,
 application_id UUID NOT NULL, owner_user_id UUID NOT NULL, title VARCHAR(160) NOT NULL,
 kind VARCHAR(16) NOT NULL CHECK (kind IN ('FAQ','SOP')),
 content TEXT NOT NULL, revision INTEGER NOT NULL CHECK (revision > 0),
 status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE','DISABLED')),
 valid_until DATE, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT sys_agent_know_app_fk FOREIGN KEY (application_id, tenant_id) REFERENCES sys_application(id, tenant_id) ON DELETE RESTRICT,
 CONSTRAINT sys_agent_know_user_fk FOREIGN KEY (owner_user_id, tenant_id) REFERENCES sys_user(id, tenant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX sys_agent_know_revision_key ON sys_agent_knowledge(document_id, revision);
CREATE INDEX sys_agent_know_owner_idx ON sys_agent_knowledge(application_id, owner_user_id, document_id);
