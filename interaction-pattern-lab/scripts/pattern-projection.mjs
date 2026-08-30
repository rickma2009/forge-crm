import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workbenchRoot = path.resolve(projectRoot, '..');
export const projectionPath = path.join(projectRoot, 'src/catalog/patterns.data.json');

function keywordsFor(asset) {
  return [...new Set([asset.name, asset.group, asset.kind, ...asset.definition.flatMap((value) => value.split(/[、，,/\s]+/))].filter(Boolean))];
}

function summaryFor(asset) {
  const [context = asset.name, composition, boundary] = asset.definition;
  return {
    problem: context,
    appliesWhen: [context],
    avoidWhen: [boundary ?? '适用边界尚未形成候选卡，采用前必须在目标项目 Spec 中确认'],
    behaviors: composition ? [composition] : [context],
    states: asset.kind === 'STATE' ? [asset.name, context] : ['初始、加载、空、成功与失败状态需按目标项目 Spec 补齐'],
    risks: [boundary ?? '当前仅为分类项，不应直接当作成熟模式或模板采用'],
  };
}

export function buildPatternProjection() {
  const registry = JSON.parse(fs.readFileSync(path.join(workbenchRoot, '_methodology/patterns/index.json'), 'utf8'));
  const validations = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/catalog/validation-slices.data.json'), 'utf8'));
  const byAsset = new Map();
  for (const validation of validations) {
    for (const assetId of validation.coveredAssetIds) {
      byAsset.set(assetId, [...(byAsset.get(assetId) ?? []), { validationId: validation.validationId, label: validation.label, demoId: validation.demoId }]);
    }
  }

  return {
    version: 1,
    registryVersion: registry.version,
    patterns: registry.assets.map((asset) => ({
      id: asset.assetId,
      kind: asset.kind,
      category: asset.group,
      name: asset.name,
      maturity: asset.maturity,
      keywords: keywordsFor(asset),
      summary: summaryFor(asset),
      sources: [asset.definitionRef.path, ...asset.artifacts],
      evidence: asset.evidence,
      nextEvidence: asset.nextEvidence,
      coveredBy: (byAsset.get(asset.assetId) ?? []).map((item) => item.validationId),
      demos: byAsset.get(asset.assetId) ?? [],
    })),
    validations,
  };
}

export function serializePatternProjection(projection) {
  return `${JSON.stringify(projection, null, 2)}\n`;
}
