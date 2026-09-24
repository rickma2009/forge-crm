ALTER TABLE "sys_dictionary"
  ADD COLUMN "parent_id" UUID,
  ADD COLUMN "items_editable" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "sys_dictionary_id_system_code_key"
  ON "sys_dictionary"("id", "system_code");

CREATE INDEX "sys_dictionary_tree_idx"
  ON "sys_dictionary"("system_code", "parent_id", "status", "sort_no");

ALTER TABLE "sys_dictionary"
  ADD CONSTRAINT "sys_dictionary_parent_id_system_code_fkey"
  FOREIGN KEY ("parent_id", "system_code")
  REFERENCES "sys_dictionary"("id", "system_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sys_dictionary"
  ADD CONSTRAINT "sys_dictionary_parent_not_self_check"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
