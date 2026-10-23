-- AlterTable
ALTER TABLE "sd_opp_analysis" ADD COLUMN     "ai_result" JSONB,
ADD COLUMN     "ai_task_id" UUID;

-- CreateTable
CREATE TABLE "ai_analysis_task" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "system_code" VARCHAR(64) NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "parent_task_id" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
    "snapshot" JSONB NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "model" VARCHAR(128) NOT NULL,
    "template_version" VARCHAR(64) NOT NULL,
    "schema_version" VARCHAR(32) NOT NULL,
    "result" JSONB,
    "confirmed_result" JSONB,
    "analysis_id" UUID,
    "confirmed_at" TIMESTAMPTZ(3),
    "stale_at_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "provider_request_id" VARCHAR(255),
    "usage" JSONB,
    "error" VARCHAR(500),
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_analysis_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_task_analysis_id_key" ON "ai_analysis_task"("analysis_id");

-- CreateIndex
CREATE INDEX "ai_analysis_task_application_id_opportunity_id_created_at_idx" ON "ai_analysis_task"("application_id", "opportunity_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_analysis_task_status_created_at_idx" ON "ai_analysis_task"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_task_application_id_created_by_request_id_key" ON "ai_analysis_task"("application_id", "created_by", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_opp_analysis_ai_task_id_key" ON "sd_opp_analysis"("ai_task_id");


ALTER TABLE ai_analysis_task ADD CONSTRAINT ai_analysis_status_ck CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED'));
ALTER TABLE ai_analysis_task ADD CONSTRAINT ai_analysis_opp_fk FOREIGN KEY (opportunity_id) REFERENCES sd_opp(id) ON DELETE RESTRICT;
ALTER TABLE ai_analysis_task ADD CONSTRAINT ai_analysis_actor_fk FOREIGN KEY (created_by) REFERENCES sys_user(id) ON DELETE RESTRICT;
ALTER TABLE sd_opp_analysis ADD CONSTRAINT sd_opp_analysis_ai_task_fk FOREIGN KEY (ai_task_id) REFERENCES ai_analysis_task(id) ON DELETE RESTRICT;
ALTER TABLE ai_analysis_task ADD CONSTRAINT ai_analysis_parent_fk FOREIGN KEY (parent_task_id) REFERENCES ai_analysis_task(id) ON DELETE RESTRICT;
ALTER TABLE ai_analysis_task ADD CONSTRAINT ai_analysis_record_fk FOREIGN KEY (analysis_id) REFERENCES sd_opp_analysis(id) ON DELETE RESTRICT;

-- Register a separate action; only the built-in system manager receives it automatically.
INSERT INTO sys_permission (id, application_id, permission_code, permission_name, resource_code, action_code, source, status, version, created_at, updated_at)
SELECT gen_random_uuid(), application_id, 'menu.opportunity-directory.ai-analyze', 'AI分析', 'opportunity-directory', 'ai-analyze', 'SYSTEM', 'ACTIVE', 1, now(), now()
FROM sys_menu WHERE menu_code='opportunity-directory'
ON CONFLICT (application_id, permission_code) DO NOTHING;
INSERT INTO sys_menu_action (id, menu_id, permission_id, action_code, action_name, action_type, sort_no, status, version, created_at, updated_at)
SELECT gen_random_uuid(), m.id, p.id, 'ai-analyze', 'AI分析', 'CREATE', 60, 'ACTIVE', 1, now(), now()
FROM sys_menu m JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='menu.opportunity-directory.ai-analyze'
WHERE m.menu_code='opportunity-directory'
ON CONFLICT (menu_id, action_code) DO NOTHING;
INSERT INTO sys_role_permission (id, role_id, application_id, permission_id, status, version, created_at, updated_at)
SELECT gen_random_uuid(), r.id, r.application_id, p.id, 'ACTIVE', 1, now(), now()
FROM sys_role r JOIN sys_permission p ON p.application_id=r.application_id AND p.permission_code='menu.opportunity-directory.ai-analyze'
WHERE r.role_code='system-manager' AND r.status='ACTIVE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO sys_page_button (id, page_id, button_code, button_name, button_type, sort_no, status, version, created_by, updated_by, created_at, updated_at)
SELECT gen_random_uuid(), page_id, 'ai-analyze', 'AI分析', 'TOOL', 60, 'ACTIVE', 1, created_by, updated_by, now(), now()
FROM sys_page_button WHERE button_code='analyze'
ON CONFLICT (page_id, button_code) DO NOTHING;
