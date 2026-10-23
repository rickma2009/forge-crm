-- A quotation transaction price may be entered even when no sales price master exists.
ALTER TABLE "sd_quotation_line"
  ALTER COLUMN "price_id" DROP NOT NULL;

ALTER TABLE "sd_quotation_line"
  DROP CONSTRAINT "sd_quote_line_values_ck";

ALTER TABLE "sd_quotation_line"
  ADD CONSTRAINT "sd_quote_line_values_ck"
  CHECK (
    quantity > 0
    AND unit_price >= 0
    AND suggested_price >= 0
    AND discount BETWEEN 0 AND 100
    AND amount >= 0
    AND sort_no >= 0
    AND price_source IN ('STANDARD', 'TIER', 'UNPRICED')
  );
