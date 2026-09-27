ALTER TABLE "style_scene"
  ADD COLUMN IF NOT EXISTS "asset_code" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "maturity" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "definition_json" JSONB,
  ADD COLUMN IF NOT EXISTS "definition_ref_json" JSONB,
  ADD COLUMN IF NOT EXISTS "artifacts_json" JSONB,
  ADD COLUMN IF NOT EXISTS "evidence_json" JSONB,
  ADD COLUMN IF NOT EXISTS "evidence_cards_json" JSONB,
  ADD COLUMN IF NOT EXISTS "next_evidence" VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS "style_scene_asset_uk"
  ON "style_scene" ("system_code", "asset_code");
