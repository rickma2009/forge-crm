ALTER TABLE "md_item"
  ADD COLUMN "major_category_id" UUID,
  ADD COLUMN "middle_category_id" UUID,
  ADD COLUMN "minor_category_id" UUID;

ALTER TABLE "sys_dictionary_item" ADD COLUMN "parent_item_id" UUID;
ALTER TABLE "sys_dictionary_item" ADD CONSTRAINT "sys_dict_item_parent_fk" FOREIGN KEY ("parent_item_id") REFERENCES "sys_dictionary_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sys_dict_item_parent_idx" ON "sys_dictionary_item"("parent_item_id", "status", "sort_no");

ALTER TABLE "md_item" ADD CONSTRAINT "md_item_major_category_fk" FOREIGN KEY ("major_category_id") REFERENCES "sys_dictionary_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_middle_category_fk" FOREIGN KEY ("middle_category_id") REFERENCES "sys_dictionary_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_minor_category_fk" FOREIGN KEY ("minor_category_id") REFERENCES "sys_dictionary_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "md_item_category_idx" ON "md_item"("tenant_id", "major_category_id", "middle_category_id", "minor_category_id");
