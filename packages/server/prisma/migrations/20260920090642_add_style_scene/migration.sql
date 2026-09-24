-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('DONE', 'WIP', 'TODO');

-- CreateTable
CREATE TABLE "style_scene" (
    "id" UUID NOT NULL,
    "system_code" VARCHAR(64) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "sub_category" VARCHAR(64),
    "scene_name" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "status" "SceneStatus" NOT NULL DEFAULT 'TODO',
    "page_path" VARCHAR(256),
    "note" VARCHAR(512),
    "done_at" TIMESTAMPTZ(3),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" VARCHAR(128) NOT NULL,
    "updated_by" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "style_scene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "style_scene_list_idx" ON "style_scene"("system_code", "status", "category", "sort_no");
