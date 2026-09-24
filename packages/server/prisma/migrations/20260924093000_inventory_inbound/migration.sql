CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'MATERIAL', 'SEMI_FINISHED');
CREATE TYPE "InboundType" AS ENUM ('PRODUCTION', 'FINISHED_GOODS', 'TRANSFER', 'STOCK_GAIN');
CREATE TYPE "InboundStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'VOIDED');
CREATE TYPE "InventoryMoveType" AS ENUM ('INBOUND', 'REVERSAL');

CREATE TABLE "md_item" (
  "item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL,
  "item_code" varchar(32) NOT NULL, "item_name" varchar(128) NOT NULL, "item_type" "ItemType" NOT NULL,
  "model" varchar(128), "product_line" varchar(64), "base_unit" varchar(32) NOT NULL,
  "batch_managed" boolean NOT NULL DEFAULT false, "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "remark" varchar(500), "version" integer NOT NULL DEFAULT 1, "created_by" varchar(128) NOT NULL,
  "updated_by" varchar(128) NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "md_item_tenant_code_key" UNIQUE ("tenant_id", "item_code"),
  CONSTRAINT "md_item_code_format_ck" CHECK ("item_code" ~ '^[A-Z0-9_-]{1,32}$')
);
CREATE INDEX "md_item_lookup_idx" ON "md_item"("tenant_id", "item_type", "status");

INSERT INTO "md_item" ("item_id","tenant_id","item_code","item_name","item_type","model","product_line","base_unit","status","remark","version","created_by","updated_by","created_at","updated_at")
SELECT "id","tenant_id","product_code","product_name",'PRODUCT'::"ItemType","model","product_line",COALESCE(NULLIF("unit",''),'件'),"status","remark","version","created_by","updated_by","created_at","updated_at" FROM "md_product"
ON CONFLICT ("tenant_id","item_code") DO NOTHING;

CREATE TABLE "org_legal_entity" (
  "entity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "org_unit_id" uuid NOT NULL,
  "entity_code" varchar(32) NOT NULL, "entity_name" varchar(128) NOT NULL, "currency_code" char(3) NOT NULL DEFAULT 'CNY',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "sort_no" integer NOT NULL DEFAULT 0, "remark" varchar(500), "version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(128) NOT NULL, "updated_by" varchar(128) NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "org_legal_tenant_code_key" UNIQUE ("tenant_id","entity_code"),
  CONSTRAINT "org_legal_org_fk" FOREIGN KEY ("org_unit_id") REFERENCES "org_unit"("id") ON DELETE RESTRICT
);
CREATE INDEX "org_legal_lookup_idx" ON "org_legal_entity"("tenant_id","status","sort_no");

CREATE TABLE "scm_warehouse" (
  "warehouse_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "legal_entity_id" uuid NOT NULL,
  "warehouse_code" varchar(32) NOT NULL, "warehouse_name" varchar(128) NOT NULL, "warehouse_type" varchar(32) NOT NULL, "warehouse_nature" varchar(32) NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE', "sort_no" integer NOT NULL DEFAULT 0, "remark" varchar(500), "version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(128) NOT NULL, "updated_by" varchar(128) NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_wh_tenant_code_key" UNIQUE ("tenant_id","warehouse_code"),
  CONSTRAINT "scm_wh_entity_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "org_legal_entity"("entity_id") ON DELETE RESTRICT
);
CREATE INDEX "scm_wh_entity_lookup_idx" ON "scm_warehouse"("tenant_id","legal_entity_id","status");

CREATE TABLE "scm_inbound_order" (
  "order_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL,
  "order_no" varchar(32) NOT NULL, "document_date" date NOT NULL, "creator_id" uuid NOT NULL, "inbound_type" "InboundType" NOT NULL,
  "status" "InboundStatus" NOT NULL DEFAULT 'DRAFT', "posted_at" timestamptz(3), "posted_by" uuid, "reversed_at" timestamptz(3), "reversed_by" uuid,
  "legal_entity_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "factory_code" varchar(32), "reason_code" varchar(32) NOT NULL,
  "currency_code" char(3) NOT NULL DEFAULT 'CNY', "remark" varchar(1000), "version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(128) NOT NULL, "updated_by" varchar(128) NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_in_tenant_no_key" UNIQUE ("tenant_id","order_no"),
  CONSTRAINT "scm_in_entity_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "org_legal_entity"("entity_id") ON DELETE RESTRICT,
  CONSTRAINT "scm_in_wh_fk" FOREIGN KEY ("warehouse_id") REFERENCES "scm_warehouse"("warehouse_id") ON DELETE RESTRICT
);
CREATE INDEX "scm_in_order_list_idx" ON "scm_inbound_order"("application_id","status","updated_at" DESC);

CREATE TABLE "scm_inbound_line" (
  "line_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "line_no" integer NOT NULL,
  "item_code" varchar(32) NOT NULL, "item_name" varchar(128) NOT NULL, "batch_no" varchar(64) NOT NULL DEFAULT '',
  "original_qty" numeric(18,4), "actual_qty" numeric(18,4) NOT NULL, "base_unit" varchar(32) NOT NULL, "amount" numeric(18,2) NOT NULL,
  "remark" varchar(1000), "created_by" varchar(128) NOT NULL, "updated_by" varchar(128) NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_in_line_no_key" UNIQUE ("order_id","line_no"),
  CONSTRAINT "scm_in_line_item_batch_key" UNIQUE ("order_id","item_code","batch_no"),
  CONSTRAINT "scm_in_line_order_fk" FOREIGN KEY ("order_id") REFERENCES "scm_inbound_order"("order_id") ON DELETE RESTRICT,
  CONSTRAINT "scm_in_line_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT,
  CONSTRAINT "scm_in_line_qty_ck" CHECK ("actual_qty" > 0), CONSTRAINT "scm_in_line_amt_ck" CHECK ("amount" >= 0)
);
CREATE INDEX "scm_in_line_item_idx" ON "scm_inbound_line"("tenant_id","item_code");

CREATE TABLE "scm_inventory_balance" (
  "balance_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "legal_entity_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL,
  "item_code" varchar(32) NOT NULL, "batch_no" varchar(64) NOT NULL DEFAULT '', "base_unit" varchar(32) NOT NULL,
  "quantity" numeric(18,4) NOT NULL DEFAULT 0, "amount" numeric(18,2) NOT NULL DEFAULT 0, "currency_code" char(3) NOT NULL DEFAULT 'CNY',
  "version" integer NOT NULL DEFAULT 1, "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_inv_bal_dim_key" UNIQUE ("tenant_id","legal_entity_id","warehouse_id","item_code","batch_no"),
  CONSTRAINT "scm_inv_bal_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT,
  CONSTRAINT "scm_inv_bal_qty_ck" CHECK ("quantity" >= 0), CONSTRAINT "scm_inv_bal_amt_ck" CHECK ("amount" >= 0)
);
CREATE INDEX "scm_inv_bal_lookup_idx" ON "scm_inventory_balance"("tenant_id","item_code","quantity");

CREATE TABLE "scm_inventory_txn" (
  "txn_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL,
  "source_type" varchar(32) NOT NULL, "source_name" varchar(64) NOT NULL, "source_order_id" uuid NOT NULL, "order_no" varchar(32) NOT NULL,
  "source_line_id" uuid NOT NULL, "line_no" integer NOT NULL, "movement_type" "InventoryMoveType" NOT NULL,
  "item_code" varchar(32) NOT NULL, "item_name" varchar(128) NOT NULL, "quantity" numeric(18,4) NOT NULL, "amount" numeric(18,2) NOT NULL,
  "batch_no" varchar(64) NOT NULL DEFAULT '', "warehouse_id" uuid NOT NULL, "legal_entity_id" uuid NOT NULL, "currency_code" char(3) NOT NULL,
  "remark" varchar(1000), "occurred_at" timestamptz(3) NOT NULL DEFAULT now(), "actor_id" uuid NOT NULL,
  CONSTRAINT "scm_inv_txn_source_key" UNIQUE ("source_line_id","movement_type"),
  CONSTRAINT "scm_inv_txn_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT
);
CREATE INDEX "scm_inv_txn_lookup_idx" ON "scm_inventory_txn"("tenant_id","warehouse_id","item_code","occurred_at" DESC);

CREATE TABLE "scm_inventory_event" (
  "event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "application_id" uuid NOT NULL, "order_id" uuid NOT NULL,
  "action" varchar(16) NOT NULL, "request_key" uuid NOT NULL, "request_hash" varchar(64) NOT NULL, "actor_id" uuid NOT NULL,
  "result" jsonb NOT NULL, "created_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_inv_event_req_key" UNIQUE ("application_id","actor_id","request_key")
);
CREATE INDEX "scm_inv_event_order_idx" ON "scm_inventory_event"("order_id","created_at");

CREATE TABLE "scm_document_counter" (
  "counter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "document_type" varchar(16) NOT NULL,
  "business_date" date NOT NULL, "current_value" integer NOT NULL DEFAULT 0, "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "scm_doc_counter_scope_key" UNIQUE ("tenant_id","document_type","business_date"),
  CONSTRAINT "scm_doc_counter_value_ck" CHECK ("current_value" BETWEEN 0 AND 99999)
);
