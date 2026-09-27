import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { interactionEvidenceCardSchema, interactionMaturitySchema } from '@forge-crm/contracts';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client';

const sourceSchema = z.strictObject({
  version: z.number().int().positive(),
  taxonomyRef: z.string(),
  generatedBy: z.string(),
  assets: z.array(z.strictObject({
    assetId: z.string().min(1).max(32),
    kind: z.enum(['PAGE', 'ACT', 'VIEW', 'STATE', 'SPECIAL', 'SCENE']),
    group: z.string().min(1).max(64),
    name: z.string().min(1).max(128),
    maturity: interactionMaturitySchema,
    definition: z.array(z.string()),
    definitionRef: z.strictObject({ path: z.string(), section: z.string() }),
    artifacts: z.array(z.string()),
    evidence: z.array(z.string()),
    evidenceCards: z.array(interactionEvidenceCardSchema),
    nextEvidence: z.string().max(500),
  })),
});

export type InteractionCatalogSeed = {
  assetCode: string;
  category: string;
  subCategory: string;
  sceneName: string;
  description: string;
  maturity: string;
  definitionJson: Prisma.InputJsonValue;
  definitionRefJson: Prisma.InputJsonValue;
  artifactsJson: Prisma.InputJsonValue;
  evidenceJson: Prisma.InputJsonValue;
  evidenceCardsJson: Prisma.InputJsonValue;
  nextEvidence: string;
  status: 'DONE';
  sortNo: number;
};

export function loadInteractionCatalog(rootDir: string): InteractionCatalogSeed[] {
  const source = sourceSchema.parse(JSON.parse(readFileSync(join(rootDir, '_methodology/patterns/index.json'), 'utf8')));
  const seen = new Set<string>();
  return source.assets.map((asset, index) => {
    if (seen.has(asset.assetId)) throw new Error(`INTERACTION_ASSET_DUPLICATE:${asset.assetId}`);
    seen.add(asset.assetId);
    return {
      assetCode: asset.assetId,
      category: asset.kind,
      subCategory: asset.group,
      sceneName: asset.name,
      description: asset.definition.join('；'),
      maturity: asset.maturity,
      definitionJson: asset.definition,
      definitionRefJson: asset.definitionRef,
      artifactsJson: asset.artifacts,
      evidenceJson: asset.evidence,
      evidenceCardsJson: asset.evidenceCards,
      nextEvidence: asset.nextEvidence,
      status: 'DONE' as const,
      sortNo: (index + 1) * 10,
    };
  });
}

export async function seedInteractionCatalog(database: Pick<Prisma.TransactionClient, 'styleScene'>, systemCode: string, rootDir: string): Promise<number> {
  const rows = loadInteractionCatalog(rootDir);
  for (const row of rows) {
    await database.styleScene.upsert({
      where: { systemCode_assetCode: { systemCode, assetCode: row.assetCode } },
      update: { ...row, updatedBy: 'seed' },
      create: { systemCode, ...row, createdBy: 'seed', updatedBy: 'seed' },
    });
  }
  return rows.length;
}
