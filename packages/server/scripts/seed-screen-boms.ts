/** Idempotent display-screen BOM demo data. No stock, purchasing, costing or production effects. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { BomService } from '../src/bom/bom.service';
import type { DatabaseService } from '../src/database/database.service';
import type { BomLineWrite } from '@forge-crm/contracts';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const actor = 'demo:screen-bom';
const screens = ['004', '006', '014', '016', '024', '034', '054', '064'].map((number) => `TEST-P-SCREEN-${number}`);

type Part = { code: string; name: string; unit?: string; group: 'electronic' | 'structural'; minor?: string; model?: string };
const parts: Part[] = [
  { code: 'DEMO-E-PCB-01', name: '演示·控制板裸板', unit: '块', group: 'electronic', minor: 'circuit_board', model: 'PCB-4L' },
  { code: 'DEMO-E-MCU-01', name: '演示·主控芯片 A', group: 'electronic', minor: 'integrated_circuit', model: 'MCU-A' },
  { code: 'DEMO-E-MCU-02', name: '演示·主控芯片 B（兼容替代）', group: 'electronic', minor: 'integrated_circuit', model: 'MCU-B' },
  { code: 'DEMO-E-DDR-01', name: '演示·DDR 存储芯片', group: 'electronic', minor: 'integrated_circuit', model: 'DDR4-4G' },
  { code: 'DEMO-E-EMMC-01', name: '演示·eMMC 存储芯片', group: 'electronic', minor: 'integrated_circuit', model: 'EMMC-32G' },
  { code: 'DEMO-E-R10K-01', name: '演示·10kΩ 电阻 A', group: 'electronic', minor: 'resistor', model: 'R10K-0603-A' },
  { code: 'DEMO-E-R10K-02', name: '演示·10kΩ 电阻 B（兼容替代）', group: 'electronic', minor: 'resistor', model: 'R10K-0603-B' },
  { code: 'DEMO-E-CAP-01', name: '演示·贴片电容', group: 'electronic', minor: 'capacitor', model: 'CAP-10UF' },
  { code: 'DEMO-E-HDMI-01', name: '演示·HDMI 接口座', group: 'electronic', minor: 'connector', model: 'HDMI-2.0' },
  { code: 'DEMO-E-TCON-01', name: '演示·液晶时序控制板', unit: '块', group: 'electronic', minor: 'circuit_board', model: 'TCON-4K' },
  { code: 'DEMO-E-PANEL-65', name: '演示·65英寸液晶面板', group: 'electronic', minor: 'display_panel', model: 'LCD-65-4K' },
  { code: 'DEMO-E-PANEL-86', name: '演示·86英寸液晶面板', group: 'electronic', minor: 'display_panel', model: 'LCD-86-4K' },
  { code: 'DEMO-E-BLIGHT-65', name: '演示·65英寸背光模组', group: 'electronic', minor: 'display_panel', model: 'BL-65' },
  { code: 'DEMO-E-BLIGHT-86', name: '演示·86英寸背光模组', group: 'electronic', minor: 'display_panel', model: 'BL-86' },
  { code: 'DEMO-E-TOUCH-IC', name: '演示·触控控制芯片', group: 'electronic', minor: 'integrated_circuit', model: 'TOUCH-IC' },
  { code: 'DEMO-E-PSU-01', name: '演示·大屏电源组件', group: 'electronic', minor: 'power_supply', model: 'PSU-300W' },
  { code: 'DEMO-E-LED-MOD', name: '演示·室内 LED 显示模组', group: 'electronic', minor: 'display_panel', model: 'LED-P2' },
  { code: 'DEMO-E-LED-RX', name: '演示·LED 接收卡', unit: '块', group: 'electronic', minor: 'circuit_board', model: 'LED-RX' },
  { code: 'DEMO-E-LED-TX', name: '演示·LED 发送卡', unit: '块', group: 'electronic', minor: 'circuit_board', model: 'LED-TX' },
  { code: 'DEMO-E-CABLE', name: '演示·内部线束', unit: '套', group: 'electronic', minor: 'connector', model: 'HARNESS-01' },
  { code: 'DEMO-E-SPEAKER', name: '演示·内置扬声器', group: 'electronic', model: 'SPK-10W' },
  { code: 'DEMO-S-GLASS-65', name: '演示·65英寸触控玻璃', group: 'structural', minor: 'cover_glass', model: 'TG-65' },
  { code: 'DEMO-S-GLASS-86', name: '演示·86英寸触控玻璃', group: 'structural', minor: 'cover_glass', model: 'TG-86' },
  { code: 'DEMO-S-FRAME-65', name: '演示·65英寸铝合金前框', group: 'structural', minor: 'frame', model: 'FRAME-65' },
  { code: 'DEMO-S-FRAME-86', name: '演示·86英寸铝合金前框', group: 'structural', minor: 'frame', model: 'FRAME-86' },
  { code: 'DEMO-S-BACK-65', name: '演示·65英寸后壳', group: 'structural', minor: 'housing', model: 'BACK-65' },
  { code: 'DEMO-S-BACK-86', name: '演示·86英寸后壳', group: 'structural', minor: 'housing', model: 'BACK-86' },
  { code: 'DEMO-S-WATERPROOF', name: '演示·交通屏防护外壳', group: 'structural', minor: 'housing', model: 'IP65-HOUSING' },
  { code: 'DEMO-S-LED-CAB', name: '演示·LED 铝合金箱体', group: 'structural', minor: 'housing', model: 'LED-CAB-P2' },
  { code: 'DEMO-S-BRACKET', name: '演示·壁挂安装支架', unit: '套', group: 'structural', minor: 'frame', model: 'WALL-MOUNT' },
  { code: 'DEMO-S-SCREW', name: '演示·M4 紧固螺钉', group: 'structural', minor: 'fastener', model: 'M4-10' },
  { code: 'DEMO-S-STYLUS', name: '演示·教学触控笔', group: 'structural', model: 'STYLUS-01' },
  { code: 'DEMO-S-CARTON', name: '演示·大屏包装箱', group: 'structural', model: 'CARTON-SCREEN' },
];

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal', status: 'ACTIVE' } });
  const admin = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, normalizedAccount: 'admin' } });
  const targets = await db.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { in: screens }, itemType: 'PRODUCT' } });
  if (targets.length !== screens.length) throw new Error(`Expected ${screens.length} existing screen products, found ${targets.length}`);
  const productByCode = new Map(targets.map((item) => [item.itemCode, item]));
  const dictionaries = await db.sysDictionary.findMany({ where: { systemCode: 'demo-portal', dictCode: { in: ['material_major_category', 'material_middle_category', 'material_minor_category'] }, status: 'ACTIVE' } });
  const dictionary = (code: string) => { const found = dictionaries.find((row) => row.dictCode === code); if (!found) throw new Error(`Missing dictionary: ${code}`); return found; };
  const major = await db.sysDictionaryItem.findFirstOrThrow({ where: { dictionaryId: dictionary('material_major_category').id, itemValue: 'raw_material', status: 'ACTIVE' } });
  const electronic = await db.sysDictionaryItem.findFirstOrThrow({ where: { dictionaryId: dictionary('material_middle_category').id, itemValue: 'electronic', parentItemId: major.id, status: 'ACTIVE' } });
  async function category(dictCode: string, value: string, name: string, parentItemId: string, sortNo: number) {
    const dict = dictionary(dictCode);
    const existing = await db.sysDictionaryItem.findUnique({ where: { dictionaryId_itemValue: { dictionaryId: dict.id, itemValue: value } } });
    if (existing) { if (existing.parentItemId !== parentItemId) throw new Error(`Category parent mismatch: ${value}`); return existing; }
    return db.sysDictionaryItem.create({ data: { dictionaryId: dict.id, parentItemId, itemCode: value, itemValue: value, itemName: name, sortNo, createdBy: actor, updatedBy: actor } });
  }
  const structural = await category('material_middle_category', 'structural_raw', '结构件（原材料）', major.id, 30);
  const minorDefs = [
    ['integrated_circuit', '集成电路', electronic.id], ['circuit_board', '电路板', electronic.id], ['capacitor', '电容', electronic.id],
    ['display_panel', '显示模组', electronic.id], ['power_supply', '电源器件', electronic.id], ['connector', '连接器', electronic.id],
    ['cover_glass', '盖板玻璃', structural.id], ['frame', '框架与支架', structural.id], ['housing', '壳体与箱体', structural.id], ['fastener', '紧固件', structural.id],
  ] as const;
  const minorIds = new Map<string, string>();
  for (const [value, name, parent] of minorDefs) minorIds.set(`${parent}:${value}`, (await category('material_minor_category', `${parent === structural.id ? 'struct_' : 'elec_'}${value}`, name, parent, 10 + minorIds.size * 10)).id);
  const existingResistor = await db.sysDictionaryItem.findFirst({ where: { dictionaryId: dictionary('material_minor_category').id, itemValue: 'resistor', parentItemId: electronic.id, status: 'ACTIVE' } });
  if (!existingResistor) throw new Error('Expected electronic resistor category');
  minorIds.set(`${electronic.id}:resistor`, existingResistor.id);
  const itemByCode = new Map<string, Awaited<ReturnType<typeof db.mdItem.findFirstOrThrow>>>();
  async function item(code: string, name: string, type: 'MATERIAL' | 'SEMI_FINISHED', group: 'electronic' | 'structural', unit: string, minor?: string, model?: string) {
    const current = await db.mdItem.findUnique({ where: { tenantId_itemCode: { tenantId: app.tenantId, itemCode: code } } });
    if (current && current.createdBy !== actor) throw new Error(`Demo item code already belongs to another source: ${code}`);
    const middle = group === 'electronic' ? electronic : structural;
    const minorCategoryId = minor ? minorIds.get(`${middle.id}:${minor}`) : undefined;
    const row = current ?? await db.mdItem.create({ data: { tenantId: app.tenantId, itemCode: code, itemName: name, itemType: type, majorCategoryId: major.id, middleCategoryId: middle.id, minorCategoryId, baseUnit: unit, model, productLine: '大屏演示物料', batchManaged: false, status: 'ACTIVE', remark: '演示测试数据：虚构规格，用于多层BOM页面交互。', createdBy: actor, updatedBy: actor } });
    if (row.itemType !== type) throw new Error(`Demo item type mismatch: ${code}`);
    itemByCode.set(code, row);
    return row;
  }
  for (const part of parts) await item(part.code, part.name, 'MATERIAL', part.group, part.unit ?? '件', part.minor, part.model);
  const assemblies = [
    ['DEMO-A-CTRL', '演示·大屏主控板组件', 'electronic', '块'],
    ['DEMO-A-LCD-65', '演示·65英寸显示组件', 'electronic', '套'],
    ['DEMO-A-LCD-86', '演示·86英寸显示组件', 'electronic', '套'],
    ['DEMO-A-TOUCH-65', '演示·65英寸触控组件', 'electronic', '套'],
    ['DEMO-A-TOUCH-86', '演示·86英寸触控组件', 'electronic', '套'],
    ['DEMO-A-LED-CAB', '演示·室内LED箱体组件', 'structural', '套'],
  ] as const;
  for (const [code, name, group, unit] of assemblies) await item(code, name, 'SEMI_FINISHED', group, unit);
  const bomService = new BomService(db as unknown as DatabaseService);
  const published = new Map<string, string>();
  const component = (code: string, quantity: string, alternatives: Array<[string, number, string]> = [], childBomId: string | null = null): Omit<BomLineWrite, 'lineCode' | 'sortNo'> => {
    const row = itemByCode.get(code); if (!row) throw new Error(`Missing component ${code}`);
    return { itemId: row.id, quantity, childBomId, alternatives: alternatives.map(([alternativeCode, priority, ratio]) => { const alternate = itemByCode.get(alternativeCode); if (!alternate) throw new Error(`Missing alternative ${alternativeCode}`); return { itemId: alternate.id, priority, ratio }; }) };
  };
  async function ensureBom(itemId: string, key: string, components: Array<ReturnType<typeof component>>) {
    const existing = await db.scmBom.findFirst({ where: { applicationId: app.id, itemId, status: 'PUBLISHED' }, orderBy: { revision: 'desc' } });
    if (existing) { published.set(key, existing.id); return; }
    const draft = await db.scmBom.findFirst({ where: { applicationId: app.id, itemId, status: 'DRAFT' } });
    if (draft && draft.createdBy !== actor) throw new Error(`Existing draft is not owned by this demo: ${key}`);
    const target = draft ? await bomService.detail('demo-portal', draft.id) : await bomService.create('demo-portal', admin.id, actor, { itemId, baseQuantity: '1' });
    const lines: BomLineWrite[] = components.map((value, index) => ({ ...value, lineCode: `L${String((index + 1) * 10).padStart(3, '0')}`, sortNo: (index + 1) * 10 }));
    const saved = await bomService.save('demo-portal', admin.id, actor, target.id, { rowVersion: target.rowVersion, baseQuantity: '1', lines });
    const next = await bomService.publish('demo-portal', admin.id, actor, saved.id, { rowVersion: saved.rowVersion });
    published.set(key, next.id);
  }
  await ensureBom(itemByCode.get('DEMO-A-CTRL')!.id, 'CTRL', [
    component('DEMO-E-PCB-01', '1'), component('DEMO-E-MCU-01', '1', [['DEMO-E-MCU-02', 1, '1']]), component('DEMO-E-DDR-01', '2'),
    component('DEMO-E-EMMC-01', '1'), component('DEMO-E-R10K-01', '20', [['DEMO-E-R10K-02', 1, '1']]), component('DEMO-E-CAP-01', '15'), component('DEMO-E-HDMI-01', '2'),
  ]);
  for (const size of ['65', '86'] as const) {
    await ensureBom(itemByCode.get(`DEMO-A-LCD-${size}`)!.id, `LCD-${size}`, [component(`DEMO-E-PANEL-${size}`, '1'), component(`DEMO-E-BLIGHT-${size}`, '1'), component('DEMO-E-TCON-01', '1')]);
    await ensureBom(itemByCode.get(`DEMO-A-TOUCH-${size}`)!.id, `TOUCH-${size}`, [component(`DEMO-S-GLASS-${size}`, '1'), component('DEMO-E-TOUCH-IC', '1'), component('DEMO-E-CABLE', '1')]);
  }
  await ensureBom(itemByCode.get('DEMO-A-LED-CAB')!.id, 'LED-CAB', [component('DEMO-S-LED-CAB', '1'), component('DEMO-E-LED-MOD', '4'), component('DEMO-E-LED-RX', '1'), component('DEMO-E-PSU-01', '1'), component('DEMO-E-CABLE', '1')]);
  const child = (code: string, quantity: string, key: string) => {
    const childBomId = published.get(key);
    if (!childBomId) throw new Error(`Missing published child BOM: ${key}`);
    return component(code, quantity, [], childBomId);
  };
  const lcdScreen = (size: '65' | '86', touch: boolean, extra: Array<ReturnType<typeof component>> = []) => [
    child('DEMO-A-CTRL', '1', 'CTRL'), child(`DEMO-A-LCD-${size}`, '1', `LCD-${size}`),
    ...(touch ? [child(`DEMO-A-TOUCH-${size}`, '1', `TOUCH-${size}`)] : []),
    component(`DEMO-S-FRAME-${size}`, '1'), component(`DEMO-S-BACK-${size}`, '1'), component('DEMO-E-PSU-01', '1'), component('DEMO-E-SPEAKER', '2'), component('DEMO-S-SCREW', size === '65' ? '20' : '28'), component('DEMO-S-CARTON', '1'), ...extra,
  ];
  const compositions: Record<string, Array<ReturnType<typeof component>>> = {
    '004': lcdScreen('65', true), '006': lcdScreen('86', true),
    '014': lcdScreen('65', true, [component('DEMO-S-STYLUS', '2')]), '016': lcdScreen('86', true, [component('DEMO-S-STYLUS', '2')]),
    '024': lcdScreen('65', false),
    '034': [child('DEMO-A-LED-CAB', '4', 'LED-CAB'), component('DEMO-E-LED-TX', '1'), component('DEMO-S-BRACKET', '1'), component('DEMO-E-CABLE', '4'), component('DEMO-S-SCREW', '32')],
    '054': lcdScreen('65', false, [component('DEMO-S-BRACKET', '1')]),
    '064': [child('DEMO-A-CTRL', '1', 'CTRL'), child('DEMO-A-LCD-65', '1', 'LCD-65'), component('DEMO-S-WATERPROOF', '1'), component('DEMO-E-PSU-01', '1'), component('DEMO-S-BRACKET', '1'), component('DEMO-S-SCREW', '24')],
  };
  for (const number of Object.keys(compositions)) await ensureBom(productByCode.get(`TEST-P-SCREEN-${number}`)!.id, `SCREEN-${number}`, compositions[number]);
  const linked = await db.scmBom.count({ where: { applicationId: app.id, itemId: { in: targets.map((row) => row.id) }, status: 'PUBLISHED' } });
  console.log(JSON.stringify({ seededMaterials: parts.length, seededAssemblies: assemblies.length, existingScreensWithPublishedBom: linked, sampleScreenCodes: screens }));
}

main().finally(async () => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
