CREATE TABLE "int_de_mail_automation" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "config" JSONB NOT NULL,
  "next_run_at" TIMESTAMPTZ(3),
  "last_run_at" TIMESTAMPTZ(3),
  "last_error" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_mail_automation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_automation_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "int_de_mail_automation_connection_key" ON "int_de_mail_automation"("connection_id");
CREATE INDEX "int_de_mail_automation_due_idx" ON "int_de_mail_automation"("enabled","next_run_at");
CREATE INDEX "int_de_mail_automation_scope_idx" ON "int_de_mail_automation"("application_id","connection_id");

CREATE TABLE "int_de_mail_message" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "uid" INTEGER NOT NULL,
  "message_id" VARCHAR(500) NOT NULL,
  "subject" VARCHAR(500) NOT NULL,
  "sender" VARCHAR(320) NOT NULL,
  "reply_to" VARCHAR(320) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "category" VARCHAR(64) NOT NULL,
  "domain" VARCHAR(64) NOT NULL,
  "risk" VARCHAR(16) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "handling_result" VARCHAR(500),
  "task_id" VARCHAR(160),
  "matched_rules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "processed_at" TIMESTAMPTZ(3),
  "deleted_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_mail_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_message_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "int_de_mail_message_uid_key" ON "int_de_mail_message"("connection_id","uid");
CREATE INDEX "int_de_mail_message_list_idx" ON "int_de_mail_message"("application_id","status","received_at");

CREATE TABLE "int_de_mail_rule" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "rule_code" VARCHAR(64) NOT NULL,
  "rule_name" VARCHAR(120) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "stop_on_match" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_mail_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_rule_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "int_de_mail_rule_code_key" ON "int_de_mail_rule"("connection_id","rule_code");
CREATE INDEX "int_de_mail_rule_list_idx" ON "int_de_mail_rule"("application_id","connection_id","enabled","priority");

CREATE TABLE "int_de_mail_template" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "template_code" VARCHAR(64) NOT NULL,
  "template_name" VARCHAR(120) NOT NULL,
  "subject_template" VARCHAR(500) NOT NULL,
  "body_template" TEXT NOT NULL,
  "mode" VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_mail_template_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_template_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "int_de_mail_template_code_key" ON "int_de_mail_template"("connection_id","template_code");
CREATE INDEX "int_de_mail_template_list_idx" ON "int_de_mail_template"("application_id","connection_id","status");

CREATE TABLE "int_de_mail_action" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "action_type" VARCHAR(32) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "idempotency_key" VARCHAR(200) NOT NULL,
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executed_at" TIMESTAMPTZ(3),
  "approved_by" UUID,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "int_de_mail_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_action_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE,
  CONSTRAINT "int_de_mail_action_message_fkey" FOREIGN KEY ("message_id") REFERENCES "int_de_mail_message"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "int_de_mail_action_idempotency_key" ON "int_de_mail_action"("idempotency_key");
CREATE INDEX "int_de_mail_action_due_idx" ON "int_de_mail_action"("status","scheduled_at");
CREATE INDEX "int_de_mail_action_message_idx" ON "int_de_mail_action"("application_id","message_id");

CREATE TABLE "int_de_mail_run" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "trigger_type" VARCHAR(24) NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "read_count" INTEGER NOT NULL DEFAULT 0,
  "new_count" INTEGER NOT NULL DEFAULT 0,
  "action_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(3),
  "error" VARCHAR(500),
  CONSTRAINT "int_de_mail_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_mail_run_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "int_de_connection"("id") ON DELETE CASCADE
);
CREATE INDEX "int_de_mail_run_list_idx" ON "int_de_mail_run"("application_id","connection_id","started_at");
