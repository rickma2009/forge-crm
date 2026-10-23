CREATE TABLE "int_de_op_topic" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL,
  "topic_code" varchar(64) NOT NULL, "topic_name" varchar(120) NOT NULL, "brand" varchar(64) NOT NULL,
  "required_terms" jsonb NOT NULL, "risk_terms" jsonb NOT NULL, "excluded_terms" jsonb NOT NULL, "languages" jsonb NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true, "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_op_topic_pkey" PRIMARY KEY ("id"), CONSTRAINT "int_de_op_topic_score_chk" CHECK (jsonb_typeof("risk_terms") = 'object')
);
CREATE UNIQUE INDEX "int_de_op_topic_app_code_key" ON "int_de_op_topic"("application_id","topic_code");
CREATE INDEX "int_de_op_topic_list_idx" ON "int_de_op_topic"("application_id","enabled");

CREATE TABLE "int_de_op_source" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL,
  "source_code" varchar(64) NOT NULL, "source_name" varchar(120) NOT NULL, "source_type" varchar(24) NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'WAITING_CONFIG', "enabled" boolean NOT NULL DEFAULT false, "config" jsonb NOT NULL,
  "credential_cipher" text, "last_checked_at" timestamptz(3), "last_error" varchar(500), "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_op_source_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_op_source_type_chk" CHECK ("source_type" IN ('GDELT','RSS','GENERIC_REST','NEWS_API','FILE_IMPORT')),
  CONSTRAINT "int_de_op_source_status_chk" CHECK ("status" IN ('WAITING_CONFIG','CONFIGURED','CONNECTED','DISABLED','ERROR'))
);
CREATE UNIQUE INDEX "int_de_op_source_app_code_key" ON "int_de_op_source"("application_id","source_code");
CREATE INDEX "int_de_op_source_list_idx" ON "int_de_op_source"("application_id","enabled","status");

CREATE TABLE "int_de_op_run" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL, "topic_id" uuid NOT NULL,
  "status" varchar(24) NOT NULL, "stage" varchar(64) NOT NULL, "source_codes" jsonb NOT NULL, "range_hours" integer NOT NULL,
  "use_ai" boolean NOT NULL, "preview_only" boolean NOT NULL, "read_count" integer NOT NULL DEFAULT 0,
  "new_count" integer NOT NULL DEFAULT 0, "duplicate_count" integer NOT NULL DEFAULT 0, "match_count" integer NOT NULL DEFAULT 0,
  "event_count" integer NOT NULL DEFAULT 0, "task_count" integer NOT NULL DEFAULT 0, "started_at" timestamptz(3) NOT NULL DEFAULT now(),
  "finished_at" timestamptz(3), "error" varchar(1000), "created_by" uuid NOT NULL,
  CONSTRAINT "int_de_op_run_pkey" PRIMARY KEY ("id"), CONSTRAINT "int_de_op_run_range_chk" CHECK ("range_hours" BETWEEN 1 AND 720)
);
CREATE INDEX "int_de_op_run_list_idx" ON "int_de_op_run"("application_id","started_at");
CREATE INDEX "int_de_op_run_topic_idx" ON "int_de_op_run"("topic_id","status");

CREATE TABLE "int_de_op_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL, "topic_id" uuid NOT NULL,
  "source_id" uuid NOT NULL, "run_id" uuid, "event_id" uuid, "external_id" varchar(300) NOT NULL, "content_hash" varchar(64) NOT NULL,
  "title" varchar(500) NOT NULL, "summary" text NOT NULL, "content" text, "source_name" varchar(120) NOT NULL,
  "source_url" varchar(2000) NOT NULL, "author" varchar(120) NOT NULL DEFAULT '', "published_at" timestamptz(3) NOT NULL,
  "fetched_at" timestamptz(3) NOT NULL DEFAULT now(), "language" varchar(12) NOT NULL DEFAULT 'zh', "country" varchar(32) NOT NULL DEFAULT '',
  "matched_terms" jsonb NOT NULL, "sentiment" varchar(16) NOT NULL DEFAULT 'UNKNOWN', "risk_score" integer NOT NULL DEFAULT 0,
  "risk_level" varchar(16) NOT NULL DEFAULT 'GENERAL', "ai_status" varchar(24) NOT NULL DEFAULT 'NOT_REQUESTED', "ai_summary" text,
  CONSTRAINT "int_de_op_item_pkey" PRIMARY KEY ("id"), CONSTRAINT "int_de_op_item_score_chk" CHECK ("risk_score" BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX "int_de_op_item_source_ext_key" ON "int_de_op_item"("source_id","external_id");
CREATE INDEX "int_de_op_item_list_idx" ON "int_de_op_item"("application_id","published_at");
CREATE INDEX "int_de_op_item_risk_idx" ON "int_de_op_item"("topic_id","risk_level");
CREATE INDEX "int_de_op_item_event_idx" ON "int_de_op_item"("event_id");

CREATE TABLE "int_de_op_event" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL, "topic_id" uuid NOT NULL,
  "event_code" varchar(64) NOT NULL, "title" varchar(500) NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'PENDING_REVIEW',
  "risk_level" varchar(16) NOT NULL DEFAULT 'GENERAL', "risk_score" integer NOT NULL DEFAULT 0, "sentiment" varchar(16) NOT NULL DEFAULT 'UNKNOWN',
  "summary" text NOT NULL, "matched_terms" jsonb NOT NULL, "source_count" integer NOT NULL DEFAULT 1, "item_count" integer NOT NULL DEFAULT 1,
  "first_seen_at" timestamptz(3) NOT NULL, "last_seen_at" timestamptz(3) NOT NULL, "owner" varchar(120) NOT NULL DEFAULT '未分配',
  "queue" varchar(64) NOT NULL DEFAULT '风险监控队列', "task_id" varchar(160), "resolution" text, "false_positive_reason" text,
  "version" integer NOT NULL DEFAULT 1, "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_op_event_pkey" PRIMARY KEY ("id"), CONSTRAINT "int_de_op_event_score_chk" CHECK ("risk_score" BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX "int_de_op_event_app_code_key" ON "int_de_op_event"("application_id","event_code");
CREATE INDEX "int_de_op_event_list_idx" ON "int_de_op_event"("application_id","status","risk_level");
CREATE INDEX "int_de_op_event_topic_idx" ON "int_de_op_event"("topic_id","last_seen_at");

ALTER TABLE "int_de_op_run" ADD CONSTRAINT "int_de_op_run_topic_fkey" FOREIGN KEY ("topic_id") REFERENCES "int_de_op_topic"("id") ON DELETE RESTRICT;
ALTER TABLE "int_de_op_item" ADD CONSTRAINT "int_de_op_item_topic_fkey" FOREIGN KEY ("topic_id") REFERENCES "int_de_op_topic"("id") ON DELETE RESTRICT;
ALTER TABLE "int_de_op_item" ADD CONSTRAINT "int_de_op_item_source_fkey" FOREIGN KEY ("source_id") REFERENCES "int_de_op_source"("id") ON DELETE RESTRICT;
ALTER TABLE "int_de_op_item" ADD CONSTRAINT "int_de_op_item_run_fkey" FOREIGN KEY ("run_id") REFERENCES "int_de_op_run"("id") ON DELETE SET NULL;
ALTER TABLE "int_de_op_item" ADD CONSTRAINT "int_de_op_item_event_fkey" FOREIGN KEY ("event_id") REFERENCES "int_de_op_event"("id") ON DELETE SET NULL;
ALTER TABLE "int_de_op_event" ADD CONSTRAINT "int_de_op_event_topic_fkey" FOREIGN KEY ("topic_id") REFERENCES "int_de_op_topic"("id") ON DELETE RESTRICT;
