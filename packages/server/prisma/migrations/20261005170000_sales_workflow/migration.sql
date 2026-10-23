-- CreateTable
CREATE TABLE "sys_wf_config" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "engine_definition_id" VARCHAR(128),
    "graph" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_wf_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_wf_approval" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "applicant_id" UUID NOT NULL,
    "participants" UUID[],
    "round" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(24) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "people" JSONB NOT NULL,
    "engine_instance_id" VARCHAR(64),
    "engine_state" JSONB,
    "effect_id" VARCHAR(64),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sys_wf_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_wf_delivery" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "approval_id" UUID,
    "config_id" UUID,
    "actor_id" UUID NOT NULL,
    "request_key" VARCHAR(128) NOT NULL,
    "command" JSONB NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ(3),
    "lease_token" UUID,
    "error" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_wf_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_wf_notice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "event_key" VARCHAR(160) NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_wf_notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_config_application_id_revision_key" ON "sys_wf_config"("application_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_config_id_tenant_id_application_id_key" ON "sys_wf_config"("id", "tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_approval_effect_id_key" ON "sys_wf_approval"("effect_id");

-- CreateIndex
CREATE INDEX "sys_wf_approval_application_id_active_idx" ON "sys_wf_approval"("application_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_approval_order_id_round_key" ON "sys_wf_approval"("order_id", "round");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_approval_id_tenant_id_application_id_key" ON "sys_wf_approval"("id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "sys_wf_delivery_status_next_at_idx" ON "sys_wf_delivery"("status", "next_at");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_delivery_application_id_actor_id_request_key_key" ON "sys_wf_delivery"("application_id", "actor_id", "request_key");

-- CreateIndex
CREATE UNIQUE INDEX "sys_wf_notice_event_key_key" ON "sys_wf_notice"("event_key");

-- CreateIndex
CREATE INDEX "sys_wf_notice_application_id_recipient_id_read_at_idx" ON "sys_wf_notice"("application_id", "recipient_id", "read_at");

-- Only one live round per order and one enabled configuration per application.
CREATE UNIQUE INDEX sys_wf_live_order_key ON sys_wf_approval(order_id) WHERE active;
CREATE UNIQUE INDEX sys_wf_enabled_config_key ON sys_wf_config(application_id) WHERE enabled;
CREATE UNIQUE INDEX sys_wf_pending_approval_key ON sys_wf_delivery(approval_id) WHERE status IN ('PENDING','PROCESSING');
ALTER TABLE sys_wf_config ADD CONSTRAINT sys_wf_cfg_app_fk FOREIGN KEY(application_id,tenant_id) REFERENCES sys_application(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_approval ADD CONSTRAINT sys_wf_apr_cfg_fk FOREIGN KEY(config_id,tenant_id,application_id) REFERENCES sys_wf_config(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_approval ADD CONSTRAINT sys_wf_apr_order_fk FOREIGN KEY(order_id,tenant_id,application_id) REFERENCES sd_sales_order(order_id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_delivery ADD CONSTRAINT sys_wf_del_app_fk FOREIGN KEY(application_id,tenant_id) REFERENCES sys_application(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_delivery ADD CONSTRAINT sys_wf_del_apr_fk FOREIGN KEY(approval_id,tenant_id,application_id) REFERENCES sys_wf_approval(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_delivery ADD CONSTRAINT sys_wf_del_cfg_fk FOREIGN KEY(config_id,tenant_id,application_id) REFERENCES sys_wf_config(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_notice ADD CONSTRAINT sys_wf_nt_apr_fk FOREIGN KEY(approval_id,tenant_id,application_id) REFERENCES sys_wf_approval(id,tenant_id,application_id) ON DELETE RESTRICT;
ALTER TABLE sys_wf_notice ADD CONSTRAINT sys_wf_nt_user_fk FOREIGN KEY(recipient_id,tenant_id) REFERENCES sys_user(id,tenant_id) ON DELETE RESTRICT;
