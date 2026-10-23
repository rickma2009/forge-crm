-- Change discount from percent-off (0=no discount, 100=free) to the
-- Chinese discount factor (1=full price, 0.9=九折, 0=free).
ALTER TABLE sd_quotation_line
  DROP CONSTRAINT IF EXISTS sd_quote_line_values_ck;

UPDATE sd_quotation_line
SET discount = ROUND((1 - discount / 100)::numeric, 2);

ALTER TABLE sd_quotation_line
  ALTER COLUMN discount SET DEFAULT 1;

ALTER TABLE sd_quotation_line
  ADD CONSTRAINT sd_quote_line_values_ck CHECK (
    quantity > 0
    AND unit_price >= 0
    AND suggested_price >= 0
    AND discount BETWEEN 0 AND 1
    AND amount >= 0
    AND sort_no >= 0
    AND price_source IN ('STANDARD', 'TIER', 'UNPRICED')
  );
