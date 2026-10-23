ALTER TABLE "crm_customer"
  DROP CONSTRAINT IF EXISTS "crm_customer_code_check";

WITH "numbered" AS (
  SELECT "id", row_number() OVER (ORDER BY "system_code", "created_at", "id") AS "sequence_no"
  FROM "crm_customer"
)
UPDATE "crm_customer" AS "customer"
SET "customer_code" = 'C' || lpad("numbered"."sequence_no"::text, 7, '0')
FROM "numbered"
WHERE "customer"."id" = "numbered"."id";

ALTER TABLE "crm_customer"
  ADD CONSTRAINT "crm_customer_code_check"
  CHECK ("customer_code" ~ '^C[0-9]{7}$');
