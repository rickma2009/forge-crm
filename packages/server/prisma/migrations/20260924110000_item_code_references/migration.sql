ALTER TABLE "sd_product_price" ADD COLUMN "item_code" varchar(32);
UPDATE "sd_product_price" p SET "item_code" = i."item_code" FROM "md_item" i WHERE i."item_id" = p."product_id" AND i."tenant_id" = p."tenant_id";
ALTER TABLE "sd_product_price" ALTER COLUMN "item_code" SET NOT NULL;
ALTER TABLE "sd_product_price" ADD CONSTRAINT "sd_price_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "sd_price_item_version_key" ON "sd_product_price"("tenant_id","item_code","version");

ALTER TABLE "sd_quotation_line" RENAME COLUMN "product_code" TO "item_code";
ALTER TABLE "sd_quotation_line" ADD CONSTRAINT "sd_quote_line_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT;

ALTER TABLE "sd_opp_product" ADD COLUMN "tenant_id" uuid;
UPDATE "sd_opp_product" p SET "tenant_id" = o."tenant_id" FROM "sd_opp" o WHERE o."id" = p."opportunity_id";
ALTER TABLE "sd_opp_product" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "sd_opp_product" RENAME COLUMN "product_code" TO "item_code";
ALTER TABLE "sd_opp_product" ADD CONSTRAINT "sd_opp_product_item_fk" FOREIGN KEY ("tenant_id","item_code") REFERENCES "md_item"("tenant_id","item_code") ON DELETE RESTRICT;
CREATE INDEX "sd_opp_product_item_idx" ON "sd_opp_product"("tenant_id","item_code");
