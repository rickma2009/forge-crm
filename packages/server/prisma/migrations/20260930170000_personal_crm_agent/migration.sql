CREATE TABLE "sys_agent_conversation" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "system_code" VARCHAR(64) NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "context_type" VARCHAR(16) NOT NULL DEFAULT 'NONE',
  "context_id" UUID,
  "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sys_agent_conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_agent_conv_context_chk" CHECK (("context_type" = 'NONE' AND "context_id" IS NULL) OR ("context_type" IN ('CUSTOMER','OPPORTUNITY') AND "context_id" IS NOT NULL)),
  CONSTRAINT "sys_agent_conv_status_chk" CHECK ("status" IN ('ACTIVE','ARCHIVED')),
  CONSTRAINT "sys_agent_conv_app_fk" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT,
  CONSTRAINT "sys_agent_conv_user_fk" FOREIGN KEY ("owner_user_id", "tenant_id") REFERENCES "sys_user"("id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "sys_agent_conv_scope_key" ON "sys_agent_conversation"("id", "application_id", "owner_user_id");
CREATE INDEX "sys_agent_conv_owner_idx" ON "sys_agent_conversation"("application_id", "owner_user_id", "status", "updated_at");

CREATE TABLE "sys_agent_message" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "request_id" UUID,
  "role" VARCHAR(16) NOT NULL,
  "content" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'COMPLETED',
  "source_refs" JSONB,
  "todo_draft" JSONB,
  "error" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sys_agent_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_agent_msg_role_chk" CHECK ("role" IN ('USER','ASSISTANT')),
  CONSTRAINT "sys_agent_msg_status_chk" CHECK ("status" IN ('RUNNING','COMPLETED','FAILED')),
  CONSTRAINT "sys_agent_msg_conv_fk" FOREIGN KEY ("conversation_id", "application_id", "owner_user_id") REFERENCES "sys_agent_conversation"("id", "application_id", "owner_user_id") ON DELETE CASCADE,
  CONSTRAINT "sys_agent_msg_app_fk" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "sys_agent_msg_request_key" ON "sys_agent_message"("conversation_id", "request_id");
CREATE INDEX "sys_agent_msg_order_idx" ON "sys_agent_message"("conversation_id", "created_at", "id");

CREATE TABLE "sys_personal_todo" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "due_date" DATE,
  "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  "context_type" VARCHAR(16) NOT NULL DEFAULT 'NONE',
  "context_id" UUID,
  "source_message_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sys_personal_todo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sys_todo_status_chk" CHECK ("status" IN ('OPEN','DONE')),
  CONSTRAINT "sys_todo_context_chk" CHECK (("context_type" = 'NONE' AND "context_id" IS NULL) OR ("context_type" IN ('CUSTOMER','OPPORTUNITY') AND "context_id" IS NOT NULL)),
  CONSTRAINT "sys_todo_app_fk" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT,
  CONSTRAINT "sys_todo_owner_fk" FOREIGN KEY ("owner_user_id", "tenant_id") REFERENCES "sys_user"("id", "tenant_id") ON DELETE RESTRICT,
  CONSTRAINT "sys_todo_creator_fk" FOREIGN KEY ("created_by", "tenant_id") REFERENCES "sys_user"("id", "tenant_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "sys_todo_source_msg_key" ON "sys_personal_todo"("source_message_id");
CREATE INDEX "sys_todo_owner_idx" ON "sys_personal_todo"("application_id", "owner_user_id", "status", "due_date");
