CREATE TABLE IF NOT EXISTS sys_wf_scope_lock (scope_key varchar(73) PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sys_wf_command (
 scope_key varchar(73) NOT NULL, request_id varchar(36) NOT NULL, digest varchar(64) NOT NULL,
 response text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(scope_key, request_id));
CREATE TABLE IF NOT EXISTS sys_wf_definition (
 scope_key varchar(73) NOT NULL, definition_id varchar(128) NOT NULL,
 code varchar(64) NOT NULL, revision integer NOT NULL, config text NOT NULL, graph text NOT NULL,
 PRIMARY KEY(scope_key, definition_id), UNIQUE(scope_key,code,revision));
CREATE TABLE IF NOT EXISTS sys_wf_instance (
 scope_key varchar(73) NOT NULL, instance_id varchar(64) NOT NULL, definition_id varchar(128) NOT NULL,
 business_key varchar(128) NOT NULL, applicant_id varchar(36) NOT NULL,
 state varchar(32) NOT NULL DEFAULT 'RUNNING', action_error varchar(500),
 PRIMARY KEY(scope_key,instance_id), UNIQUE(scope_key,business_key),
 FOREIGN KEY(scope_key,definition_id) REFERENCES sys_wf_definition(scope_key,definition_id));
CREATE TABLE IF NOT EXISTS sys_wf_audit (
 id varchar(36) PRIMARY KEY, scope_key varchar(73) NOT NULL, instance_id varchar(64) NOT NULL,
 actor_id varchar(36) NOT NULL, action varchar(32) NOT NULL, node_id varchar(64), note varchar(500),
 created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(scope_key,instance_id) REFERENCES sys_wf_instance(scope_key,instance_id));
