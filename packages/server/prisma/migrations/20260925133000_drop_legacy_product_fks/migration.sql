-- md_item is the authoritative item/product master. These constraints were
-- retained accidentally when item_code references were introduced and make
-- new md_item-only products impossible to use in sales documents.
ALTER TABLE "sd_quotation_line"
  DROP CONSTRAINT IF EXISTS "sd_quote_line_product_fk";

ALTER TABLE "sd_product_price"
  DROP CONSTRAINT IF EXISTS "sd_price_product_fk";

ALTER TABLE "sd_opp_product"
  DROP CONSTRAINT IF EXISTS "sd_opp_product_product_fkey";
