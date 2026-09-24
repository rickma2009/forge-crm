ALTER TABLE "scm_inbound_line" ADD COLUMN IF NOT EXISTS "item_id" uuid;

UPDATE "scm_inbound_line" line
SET "item_id" = item."item_id"
FROM "md_item" item
WHERE item."tenant_id" = line."tenant_id" AND item."item_code" = line."item_code";

ALTER TABLE "scm_inbound_line" ALTER COLUMN "item_id" SET NOT NULL;

ALTER TABLE "scm_inbound_line" DROP CONSTRAINT IF EXISTS "scm_in_line_item_fk";
ALTER TABLE "scm_inbound_line" ADD CONSTRAINT "scm_in_line_item_fk" FOREIGN KEY ("item_id") REFERENCES "md_item"("item_id") ON DELETE RESTRICT;

ALTER TABLE "scm_inbound_line" DROP CONSTRAINT IF EXISTS "scm_in_line_item_batch_key";
ALTER TABLE "scm_inbound_line" ADD CONSTRAINT "scm_in_line_item_batch_key" UNIQUE ("order_id", "item_id", "batch_no");
DROP INDEX IF EXISTS "scm_in_line_item_idx";
CREATE INDEX "scm_in_line_item_idx" ON "scm_inbound_line"("tenant_id", "item_id");
