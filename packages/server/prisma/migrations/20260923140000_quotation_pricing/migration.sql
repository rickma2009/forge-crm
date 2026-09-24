-- CreateTable
CREATE TABLE "sd_product_price" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "standard_price" DECIMAL(18,2) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_price_tier" (
    "id" UUID NOT NULL,
    "price_id" UUID NOT NULL,
    "lower_qty" DECIMAL(18,4) NOT NULL,
    "upper_qty" DECIMAL(18,4),
    "unit_price" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "sd_price_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_quotation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "system_code" VARCHAR(64) NOT NULL,
    "quote_code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "contact_id" UUID,
    "contact_name" VARCHAR(100),
    "opportunity_id" UUID,
    "owner_user_id" UUID NOT NULL,
    "quote_date" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "terms" VARCHAR(8000) NOT NULL DEFAULT '',
    "remark" VARCHAR(2000) NOT NULL DEFAULT '',
    "source_quote_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sd_quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_quotation_line" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "price_id" UUID NOT NULL,
    "product_code" VARCHAR(32) NOT NULL,
    "product_name" VARCHAR(128) NOT NULL,
    "model" VARCHAR(128),
    "unit" VARCHAR(32) NOT NULL,
    "product_line" VARCHAR(64) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "suggested_price" DECIMAL(18,2) NOT NULL,
    "price_source" VARCHAR(16) NOT NULL,
    "lower_qty" DECIMAL(18,4),
    "upper_qty" DECIMAL(18,4),
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "sort_no" INTEGER NOT NULL,
    "delivery" VARCHAR(200) NOT NULL DEFAULT '',
    "remark" VARCHAR(2000) NOT NULL DEFAULT '',

    CONSTRAINT "sd_quotation_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_quote_event" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "request_key" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "actor_id" UUID NOT NULL,
    "note" VARCHAR(2000) NOT NULL DEFAULT '',
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_quote_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_opp_amount_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "quotation_id" UUID,
    "old_amount" DECIMAL(18,2),
    "new_amount" DECIMAL(18,2),
    "opportunity_version" INTEGER NOT NULL,
    "actor_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_opp_amount_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sd_product_price_tenant_id_product_id_version_idx" ON "sd_product_price"("tenant_id", "product_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sd_product_price_product_id_version_key" ON "sd_product_price"("product_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sd_product_price_id_tenant_id_product_id_key" ON "sd_product_price"("id", "tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_price_tier_price_id_lower_qty_key" ON "sd_price_tier"("price_id", "lower_qty");

-- CreateIndex
CREATE UNIQUE INDEX "sd_quotation_quote_code_key" ON "sd_quotation"("quote_code");

-- CreateIndex
CREATE INDEX "sd_quotation_application_id_owner_user_id_updated_at_idx" ON "sd_quotation"("application_id", "owner_user_id", "updated_at");

-- CreateIndex
CREATE INDEX "sd_quotation_opportunity_id_idx" ON "sd_quotation"("opportunity_id");

-- CreateIndex
CREATE INDEX "sd_quotation_customer_id_idx" ON "sd_quotation"("customer_id");

-- CreateIndex
CREATE INDEX "sd_quotation_status_valid_until_idx" ON "sd_quotation"("status", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "sd_quotation_id_tenant_id_application_id_key" ON "sd_quotation"("id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "sd_quotation_line_quotation_id_sort_no_idx" ON "sd_quotation_line"("quotation_id", "sort_no");

-- CreateIndex
CREATE INDEX "sd_quote_event_quotation_id_created_at_idx" ON "sd_quote_event"("quotation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sd_quote_event_application_id_actor_id_request_key_key" ON "sd_quote_event"("application_id", "actor_id", "request_key");

-- CreateIndex
CREATE UNIQUE INDEX "sd_opp_amount_event_opportunity_id_opportunity_version_key" ON "sd_opp_amount_event"("opportunity_id", "opportunity_version");

-- AddForeignKey
ALTER TABLE "sd_price_tier" ADD CONSTRAINT "sd_price_tier_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "sd_product_price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_quotation_line" ADD CONSTRAINT "sd_quotation_line_quotation_id_tenant_id_application_id_fkey" FOREIGN KEY ("quotation_id", "tenant_id", "application_id") REFERENCES "sd_quotation"("id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_quote_event" ADD CONSTRAINT "sd_quote_event_quotation_id_tenant_id_application_id_fkey" FOREIGN KEY ("quotation_id", "tenant_id", "application_id") REFERENCES "sd_quotation"("id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE sd_quote_number_seq;
CREATE UNIQUE INDEX md_product_quote_scope_key ON md_product(id, tenant_id);
CREATE UNIQUE INDEX sd_opp_quote_scope_key ON sd_opp(id, tenant_id, application_id, customer_id);
CREATE UNIQUE INDEX sys_app_quote_scope_key ON sys_application(id, tenant_id, application_code);
CREATE UNIQUE INDEX crm_customer_quote_scope_key ON crm_customer(id, system_code);
CREATE UNIQUE INDEX crm_contact_quote_scope_key ON crm_customer_contact(id, customer_id, system_code);
CREATE UNIQUE INDEX sys_user_quote_scope_key ON sys_user(id, tenant_id);
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_product_fk FOREIGN KEY(product_id, tenant_id) REFERENCES md_product(id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE sd_product_price ADD CONSTRAINT sd_price_values_ck CHECK (version > 0 AND standard_price >= 0);
ALTER TABLE sd_price_tier ADD CONSTRAINT sd_tier_values_ck CHECK (lower_qty >= 0 AND (upper_qty IS NULL OR upper_qty > lower_qty) AND unit_price >= 0);
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_app_fk FOREIGN KEY(application_id, tenant_id, system_code) REFERENCES sys_application(id, tenant_id, application_code) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_customer_fk FOREIGN KEY(customer_id, system_code) REFERENCES crm_customer(id, system_code) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_contact_fk FOREIGN KEY(contact_id, customer_id, system_code) REFERENCES crm_customer_contact(id, customer_id, system_code) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_opp_fk FOREIGN KEY(opportunity_id, tenant_id, application_id, customer_id) REFERENCES sd_opp(id, tenant_id, application_id, customer_id) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_owner_fk FOREIGN KEY(owner_user_id, tenant_id) REFERENCES sys_user(id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_source_fk FOREIGN KEY(source_quote_id, tenant_id, application_id) REFERENCES sd_quotation(id, tenant_id, application_id) ON DELETE RESTRICT;
ALTER TABLE sd_quotation ADD CONSTRAINT sd_quote_values_ck CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED','EXPIRED') AND total >= 0 AND version > 0 AND valid_until >= quote_date);
ALTER TABLE sd_quotation_line ADD CONSTRAINT sd_quote_line_price_fk FOREIGN KEY(price_id, tenant_id, product_id) REFERENCES sd_product_price(id, tenant_id, product_id) ON DELETE RESTRICT;
ALTER TABLE sd_quotation_line ADD CONSTRAINT sd_quote_line_values_ck CHECK (quantity > 0 AND unit_price >= 0 AND suggested_price >= 0 AND discount BETWEEN 0 AND 100 AND amount >= 0 AND sort_no >= 0 AND price_source IN ('STANDARD','TIER'));
CREATE UNIQUE INDEX sd_opp_amount_scope_key ON sd_opp(id, tenant_id, application_id);
ALTER TABLE sd_opp_amount_event ADD CONSTRAINT sd_amount_opp_fk FOREIGN KEY(opportunity_id, tenant_id, application_id) REFERENCES sd_opp(id, tenant_id, application_id) ON DELETE RESTRICT;
ALTER TABLE sd_opp_amount_event ADD CONSTRAINT sd_amount_quote_fk FOREIGN KEY(quotation_id, tenant_id, application_id) REFERENCES sd_quotation(id, tenant_id, application_id) ON DELETE RESTRICT;
