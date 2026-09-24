CREATE TABLE "md_product" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "product_code" VARCHAR(32) NOT NULL,
  "product_name" VARCHAR(128) NOT NULL, "model" VARCHAR(128), "product_line" VARCHAR(64), "unit" VARCHAR(32),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "remark" VARCHAR(500), "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "md_product_pkey" PRIMARY KEY ("id"), CONSTRAINT "md_product_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "md_product_tenant_code_key" ON "md_product"("tenant_id", "product_code");
CREATE INDEX "md_product_lookup_idx" ON "md_product"("tenant_id", "status", "product_name");
ALTER TABLE "md_product" ADD CONSTRAINT "md_product_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_competitor" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "competitor_name" VARCHAR(128) NOT NULL,
  "industry_position" VARCHAR(128), "location" VARCHAR(256), "main_products" VARCHAR(1000), "strengths" VARCHAR(2000), "weaknesses" VARCHAR(2000),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "remark" VARCHAR(500), "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_competitor_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_competitor_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sd_competitor_tenant_name_key" ON "sd_competitor"("tenant_id", "competitor_name");
CREATE INDEX "sd_competitor_lookup_idx" ON "sd_competitor"("tenant_id", "status", "competitor_name");
ALTER TABLE "sd_competitor" ADD CONSTRAINT "sd_competitor_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_template" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "application_id" UUID NOT NULL,
  "template_code" VARCHAR(32) NOT NULL, "template_name" VARCHAR(128) NOT NULL, "is_default" BOOLEAN NOT NULL DEFAULT false,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_opp_template_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_template_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sd_opp_template_app_code_key" ON "sd_opp_template"("application_id", "template_code");
CREATE UNIQUE INDEX "sd_opp_template_default_key" ON "sd_opp_template"("application_id") WHERE "is_default" = true AND "status" = 'ACTIVE';
CREATE INDEX "sd_opp_template_lookup_idx" ON "sd_opp_template"("application_id", "status");
ALTER TABLE "sd_opp_template" ADD CONSTRAINT "sd_opp_template_app_fkey" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_stage" (
  "id" UUID NOT NULL, "template_id" UUID NOT NULL, "stage_code" VARCHAR(32) NOT NULL, "stage_name" VARCHAR(128) NOT NULL,
  "probability" INTEGER NOT NULL, "is_default" BOOLEAN NOT NULL DEFAULT false, "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_opp_stage_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_stage_probability_check" CHECK ("probability" BETWEEN 0 AND 100),
  CONSTRAINT "sd_opp_stage_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sd_opp_stage_template_code_key" ON "sd_opp_stage"("template_id", "stage_code");
CREATE UNIQUE INDEX "sd_opp_stage_default_key" ON "sd_opp_stage"("template_id") WHERE "is_default" = true AND "status" = 'ACTIVE';
CREATE INDEX "sd_opp_stage_lookup_idx" ON "sd_opp_stage"("template_id", "status", "sort_no");
ALTER TABLE "sd_opp_stage" ADD CONSTRAINT "sd_opp_stage_template_fkey" FOREIGN KEY ("template_id") REFERENCES "sd_opp_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "application_id" UUID NOT NULL, "system_code" VARCHAR(64) NOT NULL,
  "opportunity_code" VARCHAR(32) NOT NULL, "opportunity_name" VARCHAR(200) NOT NULL,
  "customer_id" UUID NOT NULL, "customer_name" VARCHAR(255) NOT NULL, "contact_id" UUID, "contact_name" VARCHAR(100),
  "owner_user_id" UUID NOT NULL, "owner_name" VARCHAR(128) NOT NULL, "source" VARCHAR(128),
  "template_id" UUID NOT NULL, "template_name" VARCHAR(128) NOT NULL, "stage_id" UUID NOT NULL, "stage_name" VARCHAR(128) NOT NULL,
  "stage_probability" INTEGER NOT NULL, "confidence" INTEGER NOT NULL DEFAULT 0,
  "confirmed_date" DATE, "expected_sign_date" DATE, "customer_budget" DECIMAL(18,2), "expected_amount" DECIMAL(18,2),
  "partner" VARCHAR(200), "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "remark" VARCHAR(1000), "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_opp_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_confidence_check" CHECK ("confidence" BETWEEN 0 AND 100),
  CONSTRAINT "sd_opp_stage_probability_check" CHECK ("stage_probability" BETWEEN 0 AND 100), CONSTRAINT "sd_opp_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "sd_opp_app_code_key" ON "sd_opp"("application_id", "opportunity_code");
CREATE INDEX "sd_opp_list_idx" ON "sd_opp"("application_id", "status", "updated_at" DESC);
CREATE INDEX "sd_opp_customer_idx" ON "sd_opp"("customer_id");
CREATE INDEX "sd_opp_owner_idx" ON "sd_opp"("owner_user_id");
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_app_fkey" FOREIGN KEY ("application_id", "tenant_id") REFERENCES "sys_application"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_customer_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_customer_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_owner_fkey" FOREIGN KEY ("owner_user_id", "tenant_id") REFERENCES "sys_user"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_template_fkey" FOREIGN KEY ("template_id") REFERENCES "sd_opp_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp" ADD CONSTRAINT "sd_opp_stage_fkey" FOREIGN KEY ("stage_id") REFERENCES "sd_opp_stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_product" (
  "id" UUID NOT NULL, "opportunity_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "product_code" VARCHAR(32) NOT NULL, "product_name" VARCHAR(128) NOT NULL, "model" VARCHAR(128),
  "quantity" DECIMAL(18,4) NOT NULL, "unit_price" DECIMAL(18,2) NOT NULL, "expected_amount" DECIMAL(18,2) NOT NULL,
  "requirement" VARCHAR(1000), "sort_no" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_opp_product_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_product_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "sd_opp_product_price_check" CHECK ("unit_price" >= 0 AND "expected_amount" >= 0), CONSTRAINT "sd_opp_product_version_check" CHECK ("version" > 0)
);
CREATE INDEX "sd_opp_product_list_idx" ON "sd_opp_product"("opportunity_id", "sort_no");
ALTER TABLE "sd_opp_product" ADD CONSTRAINT "sd_opp_product_opp_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sd_opp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sd_opp_product" ADD CONSTRAINT "sd_opp_product_product_fkey" FOREIGN KEY ("product_id") REFERENCES "md_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_follow_up" (
  "id" UUID NOT NULL, "opportunity_id" UUID NOT NULL, "followed_at" TIMESTAMPTZ(3) NOT NULL,
  "follower_user_id" UUID NOT NULL, "follower_name" VARCHAR(128) NOT NULL, "work_item" VARCHAR(1000) NOT NULL,
  "result_next" VARCHAR(2000), "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(128) NOT NULL, "updated_by" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sd_opp_follow_up_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_follow_up_version_check" CHECK ("version" > 0)
);
CREATE INDEX "sd_opp_follow_up_list_idx" ON "sd_opp_follow_up"("opportunity_id", "followed_at" DESC);
ALTER TABLE "sd_opp_follow_up" ADD CONSTRAINT "sd_opp_follow_up_opp_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sd_opp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_analysis" (
  "id" UUID NOT NULL, "opportunity_id" UUID NOT NULL, "opportunity_name" VARCHAR(200) NOT NULL,
  "stage_id" UUID NOT NULL, "stage_name" VARCHAR(128) NOT NULL, "stage_probability" INTEGER NOT NULL, "confidence" INTEGER NOT NULL,
  "opportunity_point" VARCHAR(2000) NOT NULL, "risk" VARCHAR(2000) NOT NULL, "next_plan" VARCHAR(2000) NOT NULL, "remark" VARCHAR(1000),
  "analyst_user_id" UUID NOT NULL, "analyst_name" VARCHAR(128) NOT NULL, "analyzed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sd_opp_analysis_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_analysis_conf_check" CHECK ("confidence" BETWEEN 0 AND 100),
  CONSTRAINT "sd_opp_analysis_prob_check" CHECK ("stage_probability" BETWEEN 0 AND 100)
);
CREATE INDEX "sd_opp_analysis_list_idx" ON "sd_opp_analysis"("opportunity_id", "analyzed_at" DESC);
ALTER TABLE "sd_opp_analysis" ADD CONSTRAINT "sd_opp_analysis_opp_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sd_opp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sd_opp_analysis" ADD CONSTRAINT "sd_opp_analysis_stage_fkey" FOREIGN KEY ("stage_id") REFERENCES "sd_opp_stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sd_opp_analysis_competitor" (
  "id" UUID NOT NULL, "analysis_id" UUID NOT NULL, "competitor_id" UUID NOT NULL, "competitor_name" VARCHAR(128) NOT NULL,
  "rank" INTEGER NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sd_opp_analysis_comp_pkey" PRIMARY KEY ("id"), CONSTRAINT "sd_opp_analysis_rank_check" CHECK ("rank" BETWEEN 1 AND 2)
);
CREATE UNIQUE INDEX "sd_opp_analysis_rank_key" ON "sd_opp_analysis_competitor"("analysis_id", "rank");
CREATE UNIQUE INDEX "sd_opp_analysis_comp_key" ON "sd_opp_analysis_competitor"("analysis_id", "competitor_id");
ALTER TABLE "sd_opp_analysis_competitor" ADD CONSTRAINT "sd_opp_analysis_ref_fkey" FOREIGN KEY ("analysis_id") REFERENCES "sd_opp_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sd_opp_analysis_competitor" ADD CONSTRAINT "sd_opp_analysis_competitor_fkey" FOREIGN KEY ("competitor_id") REFERENCES "sd_competitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
