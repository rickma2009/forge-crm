-- CreateTable
CREATE TABLE "crm_customer_contact" (
    "id" UUID NOT NULL,
    "system_code" VARCHAR(64) NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(128),
    "position" VARCHAR(128),
    "decision_role" VARCHAR(64),
    "mobile" VARCHAR(32),
    "phone" VARCHAR(32),
    "email" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "remark" VARCHAR(500),
    "sortNo" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" VARCHAR(128) NOT NULL,
    "updated_by" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crm_customer_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customer_address" (
    "id" UUID NOT NULL,
    "system_code" VARCHAR(64) NOT NULL,
    "customer_id" UUID NOT NULL,
    "address_type" VARCHAR(32) NOT NULL,
    "recipient" VARCHAR(100),
    "phone" VARCHAR(32),
    "province" VARCHAR(64),
    "city" VARCHAR(64),
    "district" VARCHAR(64),
    "detail" VARCHAR(500) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "remark" VARCHAR(500),
    "sortNo" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" VARCHAR(128) NOT NULL,
    "updated_by" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crm_customer_address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_contact_customer_idx" ON "crm_customer_contact"("system_code", "customer_id");

-- CreateIndex
CREATE INDEX "crm_address_customer_idx" ON "crm_customer_address"("system_code", "customer_id");

-- AddForeignKey
ALTER TABLE "crm_customer_contact" ADD CONSTRAINT "crm_customer_contact_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customer_address" ADD CONSTRAINT "crm_customer_address_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
