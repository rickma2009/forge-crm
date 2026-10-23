-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMoveType" ADD VALUE 'OUTBOUND';
ALTER TYPE "InventoryMoveType" ADD VALUE 'OUTBOUND_REVERSAL';

-- CreateTable
CREATE TABLE "sd_sales_order" (
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "order_date" DATE NOT NULL,
    "source_type" VARCHAR(16) NOT NULL,
    "source_id" UUID,
    "source_no" VARCHAR(64),
    "opportunity_id" UUID,
    "customer_id" UUID NOT NULL,
    "customer_code" VARCHAR(32) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "salesperson_id" UUID NOT NULL,
    "salesperson_name" VARCHAR(128) NOT NULL,
    "organization_id" UUID,
    "organization_name" VARCHAR(128) NOT NULL,
    "region" VARCHAR(64) NOT NULL,
    "order_type" VARCHAR(32) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'CNY',
    "discount" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "fulfillment_status" VARCHAR(24) NOT NULL DEFAULT 'NOT_SHIPPED',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "creator_id" UUID NOT NULL,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sd_sales_order_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "sd_sales_order_line" (
    "line_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "sort_no" INTEGER NOT NULL,
    "source_line_id" UUID,
    "item_id" UUID NOT NULL,
    "item_code" VARCHAR(32) NOT NULL,
    "item_name" VARCHAR(128) NOT NULL,
    "base_unit" VARCHAR(32) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "discounted_amount" DECIMAL(18,2) NOT NULL,
    "final_amount" DECIMAL(18,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "shipped_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_status" VARCHAR(24) NOT NULL DEFAULT 'NOT_SHIPPED',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',

    CONSTRAINT "sd_sales_order_line_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "sd_sales_outbound" (
    "outbound_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "outbound_no" VARCHAR(32) NOT NULL,
    "order_id" UUID NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "document_date" DATE NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "warehouse_name" VARCHAR(128) NOT NULL,
    "shipper_id" UUID NOT NULL,
    "shipper_name" VARCHAR(128) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'CNY',
    "sales_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cost_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "creator_id" UUID NOT NULL,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "reversed_by" UUID,
    "reversed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sd_sales_outbound_pkey" PRIMARY KEY ("outbound_id")
);

-- CreateTable
CREATE TABLE "sd_sales_outbound_line" (
    "line_id" UUID NOT NULL,
    "outbound_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "order_line_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_code" VARCHAR(32) NOT NULL,
    "item_name" VARCHAR(128) NOT NULL,
    "base_unit" VARCHAR(32) NOT NULL,
    "batch_no" VARCHAR(64) NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) NOT NULL,
    "sales_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cost_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(1000) NOT NULL DEFAULT '',

    CONSTRAINT "sd_sales_outbound_line_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "sd_sales_event" (
    "event_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "document_type" VARCHAR(16) NOT NULL,
    "document_id" UUID NOT NULL,
    "action" VARCHAR(24) NOT NULL,
    "request_key" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_sales_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "sd_so_list_idx" ON "sd_sales_order"("application_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "sd_so_source_idx" ON "sd_sales_order"("application_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_so_tenant_no_key" ON "sd_sales_order"("tenant_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "sd_so_scope_key" ON "sd_sales_order"("order_id", "tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_so_line_no_key" ON "sd_sales_order_line"("order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "sd_so_line_scope_key" ON "sd_sales_order_line"("line_id", "tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "sd_out_list_idx" ON "sd_sales_outbound"("application_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sd_out_tenant_no_key" ON "sd_sales_outbound"("tenant_id", "outbound_no");

-- CreateIndex
CREATE UNIQUE INDEX "sd_out_scope_key" ON "sd_sales_outbound"("outbound_id", "tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_out_line_no_key" ON "sd_sales_outbound_line"("outbound_id", "line_no");

-- CreateIndex
CREATE INDEX "sd_sales_event_doc_idx" ON "sd_sales_event"("document_type", "document_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sd_sales_event_req_key" ON "sd_sales_event"("application_id", "actor_id", "request_key");

-- AddForeignKey
ALTER TABLE "sd_sales_order_line" ADD CONSTRAINT "sd_sales_order_line_order_id_tenant_id_application_id_fkey" FOREIGN KEY ("order_id", "tenant_id", "application_id") REFERENCES "sd_sales_order"("order_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sales_order_line" ADD CONSTRAINT "sd_sales_order_line_item_id_tenant_id_fkey" FOREIGN KEY ("item_id", "tenant_id") REFERENCES "md_item"("item_id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sales_outbound" ADD CONSTRAINT "sd_sales_outbound_order_id_tenant_id_application_id_fkey" FOREIGN KEY ("order_id", "tenant_id", "application_id") REFERENCES "sd_sales_order"("order_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sales_outbound_line" ADD CONSTRAINT "sd_sales_outbound_line_outbound_id_tenant_id_application_i_fkey" FOREIGN KEY ("outbound_id", "tenant_id", "application_id") REFERENCES "sd_sales_outbound"("outbound_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sales_outbound_line" ADD CONSTRAINT "sd_sales_outbound_line_order_line_id_tenant_id_application_fkey" FOREIGN KEY ("order_line_id", "tenant_id", "application_id") REFERENCES "sd_sales_order_line"("line_id", "tenant_id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sales_outbound_line" ADD CONSTRAINT "sd_sales_outbound_line_item_id_tenant_id_fkey" FOREIGN KEY ("item_id", "tenant_id") REFERENCES "md_item"("item_id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A quotation may have only one active sales order; cancelling releases it.
CREATE UNIQUE INDEX "sd_so_active_quote_key" ON "sd_sales_order"("application_id", "source_id")
  WHERE "source_type" = 'QUOTATION' AND "status" <> 'CANCELLED';

ALTER TABLE "sd_sales_order" ADD CONSTRAINT "sd_so_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'));
ALTER TABLE "sd_sales_order" ADD CONSTRAINT "sd_so_source_check" CHECK ("source_type" IN ('MANUAL', 'OPPORTUNITY', 'QUOTATION'));
ALTER TABLE "sd_sales_order" ADD CONSTRAINT "sd_so_source_ref_check" CHECK (("source_type" = 'MANUAL' AND "source_id" IS NULL) OR ("source_type" <> 'MANUAL' AND "source_id" IS NOT NULL));
ALTER TABLE "sd_sales_order" ADD CONSTRAINT "sd_so_discount_check" CHECK ("discount" BETWEEN 0 AND 1);
ALTER TABLE "sd_sales_order_line" ADD CONSTRAINT "sd_so_line_qty_check" CHECK ("quantity" > 0 AND "shipped_qty" >= 0 AND "shipped_qty" <= "quantity");
ALTER TABLE "sd_sales_order_line" ADD CONSTRAINT "sd_so_line_rate_check" CHECK ("discount" BETWEEN 0 AND 1 AND "tax_rate" BETWEEN 0 AND 1);
ALTER TABLE "sd_sales_outbound" ADD CONSTRAINT "sd_out_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVERSED'));
ALTER TABLE "sd_sales_outbound_line" ADD CONSTRAINT "sd_out_line_qty_check" CHECK ("quantity" > 0);
