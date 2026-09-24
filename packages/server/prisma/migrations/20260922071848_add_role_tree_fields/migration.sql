-- AlterTable
ALTER TABLE "org_unit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_application" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_menu" ALTER COLUMN "application_id" DROP NOT NULL;
ALTER TABLE "sys_menu" RENAME CONSTRAINT "ui_menu_pkey" TO "sys_menu_pkey";

-- AlterTable
ALTER TABLE "sys_menu_action" RENAME CONSTRAINT "ui_menu_action_pkey" TO "sys_menu_action_pkey";

-- AlterTable
ALTER TABLE "sys_page_button" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_page_resource" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_page_tab" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_permission" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_role" ADD COLUMN     "effective_date_begin" TIMESTAMPTZ(3),
ADD COLUMN     "effective_date_end" TIMESTAMPTZ(3),
ADD COLUMN     "is_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "role_abbr_name" VARCHAR(64),
ADD COLUMN     "sort_no" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "tenant_id" DROP NOT NULL,
ALTER COLUMN "application_id" DROP NOT NULL,
ALTER COLUMN "role_group_id" DROP NOT NULL;
ALTER TABLE "sys_role" RENAME CONSTRAINT "iam_role_pkey" TO "sys_role_pkey";

-- AlterTable
ALTER TABLE "sys_role_group" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_role_list_view" RENAME CONSTRAINT "iam_role_list_view_pkey" TO "sys_role_list_view_pkey";

-- AlterTable
ALTER TABLE "sys_role_permission" RENAME CONSTRAINT "iam_role_permission_pkey" TO "sys_role_permission_pkey";

-- AlterTable
ALTER TABLE "sys_system_list_view" ALTER COLUMN "application_id" DROP NOT NULL;
ALTER TABLE "sys_system_list_view" RENAME CONSTRAINT "ui_system_list_view_pkey" TO "sys_system_list_view_pkey";

-- AlterTable
ALTER TABLE "sys_tenant" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_user" ALTER COLUMN "tenant_id" DROP NOT NULL;
ALTER TABLE "sys_user" RENAME CONSTRAINT "iam_user_pkey" TO "sys_user_pkey";

-- AlterTable
ALTER TABLE "sys_user_list_view" ALTER COLUMN "application_id" DROP NOT NULL;
ALTER TABLE "sys_user_list_view" RENAME CONSTRAINT "ui_user_list_view_pkey" TO "sys_user_list_view_pkey";

-- AlterTable
ALTER TABLE "sys_user_list_view_preference" ALTER COLUMN "application_id" DROP NOT NULL;
ALTER TABLE "sys_user_list_view_preference" RENAME CONSTRAINT "ui_user_list_view_preference_pkey" TO "sys_user_list_view_preference_pkey";

-- CreateIndex
CREATE INDEX "sys_role_tree_idx" ON "sys_role"("parent_id", "sort_no");

-- RenameForeignKey
ALTER TABLE "org_unit" RENAME CONSTRAINT "org_unit_parent_tenant_fkey" TO "org_unit_parent_id_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_application" RENAME CONSTRAINT "sys_application_tenant_fkey" TO "sys_application_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_menu" RENAME CONSTRAINT "ui_menu_parent_id_system_code_fkey" TO "sys_menu_parent_id_system_code_fkey";

-- RenameForeignKey
ALTER TABLE "sys_menu_action" RENAME CONSTRAINT "ui_menu_action_menu_id_fkey" TO "sys_menu_action_menu_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_page_resource" RENAME CONSTRAINT "sys_page_resource_application_scope_fkey" TO "sys_page_resource_application_id_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_page_resource" RENAME CONSTRAINT "sys_page_resource_parent_application_fkey" TO "sys_page_resource_parent_id_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_permission" RENAME CONSTRAINT "sys_permission_application_fkey" TO "sys_permission_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_group" RENAME CONSTRAINT "sys_role_group_application_fkey" TO "sys_role_group_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_list_view" RENAME CONSTRAINT "iam_role_list_view_role_id_fkey" TO "sys_role_list_view_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_list_view" RENAME CONSTRAINT "iam_role_list_view_view_id_fkey" TO "sys_role_list_view_view_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_permission" RENAME CONSTRAINT "sys_role_permission_permission_fkey" TO "sys_role_permission_permission_id_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_permission" RENAME CONSTRAINT "sys_role_permission_role_fkey" TO "sys_role_permission_role_id_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_user" RENAME CONSTRAINT "iam_role_user_role_id_fkey" TO "sys_role_user_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_role_user" RENAME CONSTRAINT "iam_role_user_user_id_fkey" TO "sys_role_user_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_user_list_view" RENAME CONSTRAINT "ui_user_list_view_base_view_id_fkey" TO "sys_user_list_view_base_view_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_user_list_view" RENAME CONSTRAINT "ui_user_list_view_user_id_fkey" TO "sys_user_list_view_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "sys_user_list_view_preference" RENAME CONSTRAINT "ui_user_list_view_preference_user_id_fkey" TO "sys_user_list_view_preference_user_id_fkey";

-- AddForeignKey
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sys_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
