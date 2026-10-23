CREATE TABLE "int_de_market_config" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "schedule_time" varchar(5) NOT NULL DEFAULT '09:00',
  "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  "commodity_api_base_url" varchar(500) NOT NULL DEFAULT 'https://api.commoditypriceapi.com/v3',
  "fx_api_base_url" varchar(500) NOT NULL DEFAULT 'https://api.frankfurter.dev/v2/rates',
  "credential_cipher" text,
  "last_run_at" timestamptz(3),
  "last_success_at" timestamptz(3),
  "last_scheduled_date" date,
  "last_error" varchar(1000),
  "is_running" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid NOT NULL,
  "updated_by" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_market_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_market_config_schedule_chk" CHECK ("schedule_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
CREATE UNIQUE INDEX "int_de_market_config_app_key" ON "int_de_market_config"("application_id");
CREATE UNIQUE INDEX "int_de_market_config_scope_key" ON "int_de_market_config"("id","tenant_id","application_id");

CREATE TABLE "int_de_market_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "item_code" varchar(32) NOT NULL,
  "item_name" varchar(80) NOT NULL,
  "source_symbol" varchar(64) NOT NULL,
  "benchmark" varchar(120) NOT NULL,
  "unit" varchar(80) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "last_market_date" date,
  "last_fetched_at" timestamptz(3),
  "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid NOT NULL,
  "updated_by" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_market_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "int_de_market_item_app_code_key" ON "int_de_market_item"("application_id","item_code");
CREATE UNIQUE INDEX "int_de_market_item_scope_key" ON "int_de_market_item"("id","tenant_id","application_id");
CREATE INDEX "int_de_market_item_list_idx" ON "int_de_market_item"("application_id","enabled","item_code");

CREATE TABLE "int_de_market_fx" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "source_code" varchar(32) NOT NULL DEFAULT 'FRANKFURTER',
  "base_currency" varchar(3) NOT NULL DEFAULT 'USD',
  "quote_currency" varchar(3) NOT NULL DEFAULT 'CNY',
  "effective_date" date NOT NULL,
  "rate" numeric(18,8) NOT NULL,
  "fetched_at" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "int_de_market_fx_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_market_fx_rate_chk" CHECK ("rate" > 0)
);
CREATE UNIQUE INDEX "int_de_market_fx_day_key" ON "int_de_market_fx"("application_id","source_code","base_currency","quote_currency","effective_date");
CREATE UNIQUE INDEX "int_de_market_fx_scope_key" ON "int_de_market_fx"("id","tenant_id","application_id");
CREATE INDEX "int_de_market_fx_date_idx" ON "int_de_market_fx"("application_id","effective_date");

CREATE TABLE "int_de_market_price" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "fx_id" uuid NOT NULL,
  "source_code" varchar(32) NOT NULL DEFAULT 'COMMODITY_PRICE_API',
  "market_date" date NOT NULL,
  "source_symbol" varchar(64) NOT NULL,
  "benchmark" varchar(120) NOT NULL,
  "unit" varchar(80) NOT NULL,
  "open_usd" numeric(20,8),
  "high_usd" numeric(20,8),
  "low_usd" numeric(20,8),
  "close_usd" numeric(20,8) NOT NULL,
  "open_cny" numeric(20,8),
  "high_cny" numeric(20,8),
  "low_cny" numeric(20,8),
  "close_cny" numeric(20,8) NOT NULL,
  "fx_rate" numeric(18,8) NOT NULL,
  "fx_date" date NOT NULL,
  "fetched_at" timestamptz(3) NOT NULL DEFAULT now(),
  "source_payload" jsonb NOT NULL,
  CONSTRAINT "int_de_market_price_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_market_price_fx_rate_chk" CHECK ("fx_rate" > 0)
);
CREATE UNIQUE INDEX "int_de_market_price_day_key" ON "int_de_market_price"("application_id","item_id","source_code","market_date");
CREATE UNIQUE INDEX "int_de_market_price_scope_key" ON "int_de_market_price"("id","tenant_id","application_id");
CREATE INDEX "int_de_market_price_trend_idx" ON "int_de_market_price"("application_id","item_id","market_date" DESC);
ALTER TABLE "int_de_market_price" ADD CONSTRAINT "int_de_market_price_item_fkey" FOREIGN KEY ("item_id","tenant_id","application_id") REFERENCES "int_de_market_item"("id","tenant_id","application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "int_de_market_price" ADD CONSTRAINT "int_de_market_price_fx_fkey" FOREIGN KEY ("fx_id","tenant_id","application_id") REFERENCES "int_de_market_fx"("id","tenant_id","application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "int_de_market_cursor" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "cursor_code" varchar(40) NOT NULL,
  "cursor_date" date,
  "last_success_at" timestamptz(3),
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "int_de_market_cursor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "int_de_market_cursor_app_code_key" ON "int_de_market_cursor"("application_id","cursor_code");

CREATE TABLE "int_de_market_run" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "trigger_type" varchar(16) NOT NULL,
  "status" varchar(16) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "item_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  "started_at" timestamptz(3) NOT NULL DEFAULT now(),
  "finished_at" timestamptz(3),
  "error" varchar(1000),
  "created_by" uuid NOT NULL,
  CONSTRAINT "int_de_market_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "int_de_market_run_trigger_chk" CHECK ("trigger_type" IN ('MANUAL','SCHEDULED')),
  CONSTRAINT "int_de_market_run_status_chk" CHECK ("status" IN ('RUNNING','SUCCEEDED','PARTIAL','FAILED'))
);
CREATE INDEX "int_de_market_run_list_idx" ON "int_de_market_run"("application_id","started_at" DESC);
