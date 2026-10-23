import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { interactionTemplateBehaviorSchema, interactionTemplateSchema } from '@forge-crm/contracts';
import type { Prisma } from '../generated/prisma/client';

const sourceSchema = z.strictObject({ version: z.number().int().positive(),
  defaults: interactionTemplateBehaviorSchema.optional(),
  behaviorOverrides: z.record(interactionTemplateBehaviorSchema.partial()).optional(),
  templates: z.array(z.strictObject({
  code: z.string().regex(/^TPL-\d{2}-\d{2}$/), category: z.string().min(1).max(64),
  name: z.string().min(1).max(128), summary: z.string().max(512), metadata: interactionTemplateSchema,
})) });

export function loadTemplateLibrary(rootDir: string) {
  const source = sourceSchema.parse(JSON.parse(readFileSync(join(rootDir, '_methodology/templates/index.json'), 'utf8')));
  if (new Set(source.templates.map((t) => t.code)).size !== source.templates.length) throw new Error('TEMPLATE_CODE_DUPLICATE');
  const codes = new Set(source.templates.map((template) => template.code));
  for (const code of Object.keys(source.behaviorOverrides ?? {})) if (!codes.has(code)) throw new Error(`TEMPLATE_OVERRIDE_UNKNOWN:${code}`);
  return source.templates.map((template) => {
    for (const code of template.metadata.relatedTemplates) if (!codes.has(code)) throw new Error(`TEMPLATE_RELATED_UNKNOWN:${code}`);
    return { ...template, metadata: interactionTemplateSchema.parse({ ...template.metadata,
      ...(source.defaults ? { behaviorRules: { ...source.defaults, ...source.behaviorOverrides?.[template.code] } } : {}),
    }) };
  });
}

/** Upsert templates only; historical EPM assets and business data are retained. */
export async function seedTemplateLibrary(database: Pick<Prisma.TransactionClient, 'styleScene'>, systemCode: string, rootDir: string) {
  const templates = loadTemplateLibrary(rootDir);
  for (const [index, template] of templates.entries()) {
    const row = {
      category: template.category, subCategory: null, sceneName: template.name, description: template.summary,
      templateJson: template.metadata as Prisma.InputJsonValue, definitionJson: [template.summary],
      definitionRefJson: { path: 'docs/design/interaction-template-library.md', section: template.category },
      artifactsJson: template.metadata.components, sortNo: (index + 1) * 10,
    };
    await database.styleScene.upsert({ where: { systemCode_assetCode: { systemCode, assetCode: template.code } },
      create: { ...row, systemCode, assetCode: template.code, evidenceJson: [], evidenceCardsJson: [],
        nextEvidence: '效果图、独立演示、组件骨架和接入说明齐备并验证后调整可用程度',
        maturity: 'candidate', status: 'TODO', pagePath: null,
        createdBy: 'template-library-seed', updatedBy: 'template-library-seed' },
      update: { ...row, updatedBy: 'template-library-seed' },
    });
  }
  return templates.length;
}

const componentSourceSchema = z.strictObject({ version: z.number().int().positive(), components: z.array(z.strictObject({
  code: z.string().regex(/^CMP-\d{2}$/), name: z.string().min(1).max(128), summary: z.string().min(1).max(512),
  sourcePaths: z.array(z.string().min(1)).min(1), usageSnippet: z.string().min(1),
  suitableFor: z.array(z.string()).default([]), regions: z.array(z.string()).default([]), steps: z.array(z.string()).default([]),
  config: z.array(z.string()).default([]), dependencies: z.array(z.string()).default([]), tags: z.array(z.string()).default([]),
  thumbnail: z.string().startsWith('/template-previews/').nullable(),
  previewSource: z.strictObject({ name: z.string().min(1), path: z.string().startsWith('/showcase/'), capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), scope: z.string().min(1) }).nullable(),
  applications: z.array(z.strictObject({ name: z.string(), path: z.string().startsWith('/showcase/'), pageType: z.string().optional() })).min(1),
  relatedTemplates: z.array(z.string().regex(/^TPL-\d{2}-\d{2}$/)).default([]),
})) });

export function loadComponentLibrary(rootDir: string) {
  const source = componentSourceSchema.parse(JSON.parse(readFileSync(join(rootDir, '_methodology/components/index.json'), 'utf8')));
  const promptTemplate = readFileSync(join(rootDir, '_methodology/templates/ui/component-adoption-prompt-template.md'), 'utf8');
  if (new Set(source.components.map((component) => component.code)).size !== source.components.length) throw new Error('COMPONENT_CODE_DUPLICATE');
  return source.components.map((component) => {
    const list = (values: string[]) => values.length ? values.map(value => `- ${value}`).join('\n') : '- 尚未登记，请从源码核对，不推断为无需配置或依赖。';
    const promptValues: Record<string, string> = { name: component.name, code: component.code,
      sourcePaths: list(component.sourcePaths), suitableFor: list(component.suitableFor), steps: list(component.steps),
      dependencies: list(component.dependencies), config: list(component.config) };
    const referencePrompt = promptTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (!(key in promptValues)) throw new Error(`COMPONENT_PROMPT_FIELD_UNKNOWN:${key}`);
      return promptValues[key];
    });
    for (const path of component.sourcePaths) if (!existsSync(join(rootDir, path))) throw new Error(`COMPONENT_SOURCE_MISSING:${path}`);
    if (component.thumbnail && !existsSync(join(rootDir, 'packages/web/public' + component.thumbnail))) throw new Error(`COMPONENT_PREVIEW_MISSING:${component.thumbnail}`);
    if (Boolean(component.thumbnail) !== Boolean(component.previewSource)) throw new Error(`COMPONENT_PREVIEW_SOURCE_MISMATCH:${component.code}`);
    return { ...component, metadata: interactionTemplateSchema.parse({
      availability: component.thumbnail ? 'reusable' : 'interactive',
      suitableFor: component.suitableFor, regions: component.regions, steps: component.steps, config: component.config,
      components: component.dependencies, tags: component.tags,
      thumbnail: component.thumbnail, previewKind: component.thumbnail ? 'screenshot' : null,
      ...(component.previewSource ? { previewSource: component.previewSource } : {}),
      demoPath: null, applications: component.applications,
      sourcePaths: component.sourcePaths, usageSnippet: component.usageSnippet,
      referencePrompt,
      version: '2026-10-03', relatedTemplates: component.relatedTemplates,
    }) };
  });
}

/** Code-owned fields shared by initialization and explicit catalog maintenance. */
export function componentLibraryEntries(rootDir: string) {
  return loadComponentLibrary(rootDir).map((component, index) => ({ code: component.code, data: {
      category: '插件组件', subCategory: null, sceneName: component.name, description: component.summary,
      templateJson: component.metadata as Prisma.InputJsonValue, definitionJson: [component.summary],
      definitionRefJson: { path: '_methodology/components/index.json', section: component.code },
      artifactsJson: component.sourcePaths, sortNo: 10000 + (index + 1) * 10,
    } }));
}

/** Register public components alongside, without replacing, page interaction templates. */
export async function seedComponentLibrary(database: Pick<Prisma.TransactionClient, 'styleScene'>, systemCode: string, rootDir: string) {
  const entries = componentLibraryEntries(rootDir);
  for (const { code, data: row } of entries) {
    await database.styleScene.upsert({ where: { systemCode_assetCode: { systemCode, assetCode: code } },
      create: { ...row, systemCode, assetCode: code, evidenceJson: [], evidenceCardsJson: [], nextEvidence: null,
        maturity: 'candidate', status: 'DONE', pagePath: null,
        createdBy: 'component-library-seed', updatedBy: 'component-library-seed' },
      update: { ...row, updatedBy: 'component-library-seed' },
    });
  }
  return entries.length;
}
