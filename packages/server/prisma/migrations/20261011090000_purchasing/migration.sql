-- CreateTable
CREATE TABLE "md_supplier" (
    "supplier_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_code" VARCHAR(32) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(128) NOT NULL,
    "category_code" VARCHAR(32) NOT NULL,
    "credit_code" VARCHAR(32) NOT NULL DEFAULT '',
    "contact_name" VARCHAR(128) NOT NULL DEFAULT '',
    "phone" VARCHAR(64) NOT NULL DEFAULT '',
    "email" VARCHAR(128) NOT NULL DEFAULT '',
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "payment_term_days" INTEGER NOT NULL DEFAULT 30,
    "lead_time_days" INTEGER NOT NULL DEFAULT 7,
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.13,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',
    "deleted_at" TIMESTAMPTZ(3),
    "creator_id" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "md_supplier_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "scm_purchase_order" (
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "order_date" DATE NOT NULL,
    "expected_date" DATE NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_code" VARCHAR(32) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "buyer_id" UUID NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "order_type" VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'CNY',
    "discount" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "fulfillment_status" VARCHAR(24) NOT NULL DEFAULT 'NOT_RECEIVED',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "creator_id" UUID NOT NULL,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scm_purchase_order_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "scm_purchase_order_line" (
    "line_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "sort_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_code" VARCHAR(32) NOT NULL,
    "item_name" VARCHAR(128) NOT NULL,
    "base_unit" VARCHAR(32) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,6) NOT NULL,
    "discount" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "final_amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "received_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_status" VARCHAR(24) NOT NULL DEFAULT 'NOT_RECEIVED',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',

    CONSTRAINT "scm_purchase_order_line_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "scm_purchase_receipt" (
    "receipt_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "receipt_no" VARCHAR(32) NOT NULL,
    "order_id" UUID NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "document_date" DATE NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'CNY',
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cost_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "creator_id" UUID NOT NULL,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "posted_by" UUID,
    "posted_at" TIMESTAMPTZ(3),
    "reversed_by" UUID,
    "reversed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scm_purchase_receipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "scm_purchase_receipt_line" (
    "line_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "source_line_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_code" VARCHAR(32) NOT NULL,
    "item_name" VARCHAR(128) NOT NULL,
    "base_unit" VARCHAR(32) NOT NULL,
    "batch_no" VARCHAR(64) NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) NOT NULL,
    "gross_amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "cost_amount" DECIMAL(18,2) NOT NULL,
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',

    CONSTRAINT "scm_purchase_receipt_line_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "scm_purchase_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_type" VARCHAR(16) NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "request_key" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "actor_id" UUID NOT NULL,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scm_purchase_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "md_supplier_list_idx" ON "md_supplier"("tenant_id", "status", "supplier_name");

-- CreateIndex
CREATE UNIQUE INDEX "md_supplier_code_key" ON "md_supplier"("tenant_id", "supplier_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_supplier_scope_key" ON "md_supplier"("supplier_id", "tenant_id");

-- CreateIndex
CREATE INDEX "scm_po_list_idx" ON "scm_purchase_order"("application_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "scm_po_no_key" ON "scm_purchase_order"("tenant_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "scm_po_scope_key" ON "scm_purchase_order"("order_id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "scm_po_item_idx" ON "scm_purchase_order_line"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "scm_po_line_no_key" ON "scm_purchase_order_line"("order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "scm_po_line_scope_key" ON "scm_purchase_order_line"("line_id", "order_id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "scm_pr_list_idx" ON "scm_purchase_receipt"("application_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "scm_pr_order_idx" ON "scm_purchase_receipt"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scm_pr_no_key" ON "scm_purchase_receipt"("tenant_id", "receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "scm_pr_scope_key" ON "scm_purchase_receipt"("receipt_id", "order_id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "scm_pr_source_idx" ON "scm_purchase_receipt_line"("order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "scm_pr_line_no_key" ON "scm_purchase_receipt_line"("receipt_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "scm_pr_line_batch_key" ON "scm_purchase_receipt_line"("receipt_id", "order_line_id", "batch_no");

-- CreateIndex
CREATE INDEX "scm_pc_event_doc_idx" ON "scm_purchase_event"("application_id", "document_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scm_pc_event_req_key" ON "scm_purchase_event"("application_id", "actor_id", "request_key");

-- CreateIndex
CREATE UNIQUE INDEX "org_legal_scope_key" ON "org_legal_entity"("entity_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "scm_wh_scope_key" ON "scm_warehouse"("warehouse_id", "tenant_id", "legal_entity_id");

-- AddForeignKey
ALTER TABLE "scm_purchase_order_line" ADD CONSTRAINT "scm_purchase_order_line_order_id_tenant_id_application_id_fkey" FOREIGN KEY ("order_id", "tenant_id", "application_id") REFERENCES "scm_purchase_order"("order_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "scm_purchase_receipt_line_receipt_id_order_id_tenant_id_ap_fkey" FOREIGN KEY ("receipt_id", "order_id", "tenant_id", "application_id") REFERENCES "scm_purchase_receipt"("receipt_id", "order_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "md_supplier" ADD CONSTRAINT "sup_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_app_fk" FOREIGN KEY (application_id, tenant_id) REFERENCES "sys_application" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_app_fk" FOREIGN KEY (application_id, tenant_id) REFERENCES "sys_application" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order_line" ADD CONSTRAINT "pol_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order_line" ADD CONSTRAINT "pol_app_fk" FOREIGN KEY (application_id, tenant_id) REFERENCES "sys_application" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "prl_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "prl_app_fk" FOREIGN KEY (application_id, tenant_id) REFERENCES "sys_application" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_event" ADD CONSTRAINT "pce_tenant_fk" FOREIGN KEY (tenant_id) REFERENCES "sys_tenant" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_event" ADD CONSTRAINT "pce_app_fk" FOREIGN KEY (application_id, tenant_id) REFERENCES "sys_application" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "md_supplier" ADD CONSTRAINT "sup_creator_id_fk" FOREIGN KEY (creator_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "md_supplier" ADD CONSTRAINT "sup_updated_by_fk" FOREIGN KEY (updated_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_creator_id_fk" FOREIGN KEY (creator_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_submitted_by_fk" FOREIGN KEY (submitted_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_approved_by_fk" FOREIGN KEY (approved_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_buyer_id_fk" FOREIGN KEY (buyer_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_supplier_fk" FOREIGN KEY (supplier_id, tenant_id) REFERENCES "md_supplier" (supplier_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_legal_fk" FOREIGN KEY (legal_entity_id, tenant_id) REFERENCES "org_legal_entity" (entity_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "po_warehouse_fk" FOREIGN KEY (warehouse_id, tenant_id, legal_entity_id) REFERENCES "scm_warehouse" (warehouse_id, tenant_id, legal_entity_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_creator_id_fk" FOREIGN KEY (creator_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_submitted_by_fk" FOREIGN KEY (submitted_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_approved_by_fk" FOREIGN KEY (approved_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_receiver_id_fk" FOREIGN KEY (receiver_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_posted_by_fk" FOREIGN KEY (posted_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_reversed_by_fk" FOREIGN KEY (reversed_by, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_supplier_fk" FOREIGN KEY (supplier_id, tenant_id) REFERENCES "md_supplier" (supplier_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_legal_fk" FOREIGN KEY (legal_entity_id, tenant_id) REFERENCES "org_legal_entity" (entity_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_warehouse_fk" FOREIGN KEY (warehouse_id, tenant_id, legal_entity_id) REFERENCES "scm_warehouse" (warehouse_id, tenant_id, legal_entity_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_event" ADD CONSTRAINT "pce_actor_fk" FOREIGN KEY (actor_id, tenant_id) REFERENCES "sys_user" (id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pr_order_fk" FOREIGN KEY (order_id, tenant_id, application_id) REFERENCES "scm_purchase_order" (order_id, tenant_id, application_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "prl_order_line_fk" FOREIGN KEY (order_line_id, order_id, tenant_id, application_id) REFERENCES "scm_purchase_order_line" (line_id, order_id, tenant_id, application_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_order_line" ADD CONSTRAINT "pol_item_fk" FOREIGN KEY (item_id, tenant_id) REFERENCES "md_item" (item_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "prl_item_fk" FOREIGN KEY (item_id, tenant_id) REFERENCES "md_item" (item_id, tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "md_supplier" ADD CONSTRAINT "pc_values_0_check" CHECK (status IN ('ACTIVE','DISABLED') AND payment_term_days >= 0 AND lead_time_days >= 0 AND tax_rate BETWEEN 0 AND 1 AND version > 0);

ALTER TABLE "scm_purchase_order" ADD CONSTRAINT "pc_values_1_check" CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','VOIDED') AND fulfillment_status IN ('NOT_RECEIVED','PARTIAL','FULL','REMAINDER_CLOSED') AND discount BETWEEN 0 AND 1 AND amount >= 0 AND net_amount >= 0 AND tax_amount BETWEEN 0 AND net_amount AND expected_date >= order_date AND currency_code = 'CNY' AND version > 0);

ALTER TABLE "scm_purchase_order_line" ADD CONSTRAINT "pc_values_2_check" CHECK (quantity > 0 AND received_qty BETWEEN 0 AND quantity AND unit_price >= 0 AND discount BETWEEN 0 AND 1 AND tax_rate BETWEEN 0 AND 1 AND amount >= 0 AND final_amount >= 0 AND tax_amount BETWEEN 0 AND final_amount AND line_no > 0 AND sort_no > 0 AND line_status IN ('NOT_RECEIVED','PARTIAL','FULL'));

ALTER TABLE "scm_purchase_receipt" ADD CONSTRAINT "pc_values_3_check" CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','POSTED','REVERSED','VOIDED') AND currency_code = 'CNY' AND gross_amount >= 0 AND tax_amount BETWEEN 0 AND gross_amount AND cost_amount = gross_amount-tax_amount AND version > 0);

ALTER TABLE "scm_purchase_receipt_line" ADD CONSTRAINT "pc_values_4_check" CHECK (quantity > 0 AND line_no > 0 AND source_line_no > 0 AND gross_amount >= 0 AND tax_amount BETWEEN 0 AND gross_amount AND cost_amount = gross_amount-tax_amount);
