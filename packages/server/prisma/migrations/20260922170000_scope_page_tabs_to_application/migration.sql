ALTER TABLE "sys_page_tab" ADD COLUMN "application_id" UUID;

UPDATE "sys_page_tab" tab
SET "application_id" = page."application_id"
FROM "sys_page_resource" page
WHERE page."id" = tab."page_id";

ALTER TABLE "sys_page_tab" ALTER COLUMN "application_id" SET NOT NULL;
ALTER TABLE "sys_page_tab" DROP CONSTRAINT "sys_page_tab_page_id_fkey";
ALTER TABLE "sys_page_tab" DROP CONSTRAINT "sys_page_tab_target_page_id_fkey";
ALTER TABLE "sys_page_tab" ADD CONSTRAINT "sys_page_tab_page_application_fkey" FOREIGN KEY ("page_id", "application_id") REFERENCES "sys_page_resource"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sys_page_tab" ADD CONSTRAINT "sys_page_tab_target_application_fkey" FOREIGN KEY ("target_page_id", "application_id") REFERENCES "sys_page_resource"("id", "application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
