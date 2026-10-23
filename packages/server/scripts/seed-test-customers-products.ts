import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { customerWriteSchema, itemWriteSchema, systemCodeSchema } from '@forge-crm/contracts';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../..', '.env'), quiet: true });
const systemCode = systemCodeSchema.parse(process.argv[2] ?? 'demo-portal');
const marker = 'test-data-20260928';
const cities = ['深圳', '广州', '杭州', '上海', '苏州', '南京', '成都', '武汉', '北京', '西安'];
const businesses = ['智能制造', '显示科技', '电子设备', '系统集成', '数字传媒', '教育装备', '工业自动化', '信息技术', '智慧交通', '商业展示'];
const boards = [
  ['工业控制主板', 'IPC', '四核处理器，双网口，工业接口'],
  ['ARM嵌入式主板', 'ARM', 'ARM处理器，Linux系统支持'],
  ['OPS电脑板卡', 'OPS', 'OPS插拔式接口，教学与会议显示应用'],
  ['液晶显示驱动板', 'LCD', 'HDMI输入，液晶面板驱动'],
  ['LED发送卡', 'LED-TX', '视频信号发送，多路网络输出'],
  ['LED接收卡', 'LED-RX', 'LED模组控制，亮度与色彩校正'],
  ['触控控制板', 'TOUCH', '多点触控，USB接口'],
  ['视频拼接处理板', 'SPLICE', '多画面拼接，视频信号处理'],
  ['数字标牌播放板', 'SIGN', '网络播放，远程内容管理'],
  ['电源管理板', 'POWER', '多路供电，电压监测'],
];
const screens = [
  ['会议交互大屏', 'CONF', '4K，多点触控，会议协作'],
  ['教学交互大屏', 'EDU', '4K，触控书写，教学展示'],
  ['商用信息发布大屏', 'AD', '4K，定时播放，商业展示'],
  ['室内LED小间距大屏', 'LED-IN', '室内小间距LED，会议与展厅展示'],
  ['户外LED显示大屏', 'LED-OUT', '户外LED，高亮度，防护型箱体'],
  ['液晶拼接大屏', 'LCD-WALL', '窄边框液晶拼接，监控与指挥中心'],
  ['智慧交通显示大屏', 'TRAFFIC', '交通信息发布，全天候显示'],
  ['指挥调度大屏', 'CONTROL', '多信号展示，集中调度监控'],
  ['展厅高清大屏', 'EXHIBIT', '高清展示，展厅内容播放'],
  ['移动会议大屏', 'MOBILE', '触控，移动支架，会议展示'],
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    const category = await db.sysDictionaryItem.findFirstOrThrow({ where: { itemValue: 'finished_goods', status: 'ACTIVE', dictionary: { systemCode, dictCode: 'material_major_category', status: 'ACTIVE' } } });
    const customers = Array.from({ length: 100 }, (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      const customer = customerWriteSchema.parse({
        customerName: `测试-${cities[i % 10]}${businesses[Math.floor(i / 10)]}${n}有限公司`,
        shortName: `测试${cities[i % 10]}${n}`, categoryValue: ['formal', 'potential', 'partner'][i % 3],
        statusValue: i % 10 === 9 ? 'paused' : 'active', industryValue: ['manufacturing', 'technology', 'retail', 'service', 'other'][i % 5],
        levelValue: ['a', 'b', 'c', 'd'][i % 4], address: `${cities[i % 10]}市测试园区示例路${i + 1}号（虚构地址）`,
        remark: '测试数据：虚构客户，用于查询、筛选、分页和业务联调。',
      });
      return { systemCode, customerCode: `C202609${String(i + 101).padStart(4, '0')}`, ...customer, createdBy: marker, updatedBy: marker };
    });
    const items = Array.from({ length: 200 }, (_, i) => {
      const board = i < 100, index = i % 100, variant = index % 10;
      const [name, modelCode, features] = (board ? boards : screens)[Math.floor(index / 10)];
      const spec = board ? `${[2, 4, 8, 16, 32][variant % 5]}GB / ${[16, 32, 64, 128, 256][variant % 5]}GB` : (Math.floor(index / 10) === 3 || Math.floor(index / 10) === 4 ? `P${[1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8][variant]}` : `${[43, 49, 55, 65, 75, 86, 98, 105, 110, 120][variant]}英寸`);
      const input = itemWriteSchema.parse({
        itemCode: `TEST-P-${board ? 'BOARD' : 'SCREEN'}-${String(index + 1).padStart(3, '0')}`,
        itemName: `测试-${name}-${spec}-${variant + 1}`, itemType: 'PRODUCT', majorCategoryId: category.id,
        model: `${modelCode}-${String(variant + 1).padStart(2, '0')}`, productLine: board ? '板卡产品' : '大屏产品',
        baseUnit: board ? '块' : '台', batchManaged: true, status: 'ACTIVE',
        remark: `测试数据：虚构产品规格，仅用于测试；${features}；${spec}。`,
      });
      return { tenantId: app.tenantId, ...input, createdBy: marker, updatedBy: marker };
    });
    // Validate existing dictionary references before writing anything.
    for (const [dictCode, field] of [['customer_category', 'categoryValue'], ['customer_status', 'statusValue'], ['customer_industry', 'industryValue'], ['customer_level', 'levelValue']] as const) {
      const allowed = await db.sysDictionaryItem.findMany({ where: { status: 'ACTIVE', dictionary: { systemCode, dictCode, status: 'ACTIVE' } }, select: { itemValue: true } });
      const values = new Set(allowed.map((row) => row.itemValue));
      if (customers.some((row) => !values.has(row[field]!))) throw new Error(`INVALID_DICTIONARY_VALUES:${dictCode}`);
    }
    const result = await db.$transaction(async (tx) => {
      const existingCustomers = await tx.crmCustomer.findMany({ where: { systemCode, customerCode: { in: customers.map((row) => row.customerCode) } } });
      const existingItems = await tx.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { in: items.map((row) => row.itemCode) } } });
      if ([...existingCustomers, ...existingItems].some((row) => row.createdBy !== marker)) throw new Error('TEST_CODE_COLLISION_WITH_EXISTING_DATA');
      const addedCustomers = await tx.crmCustomer.createMany({ data: customers, skipDuplicates: true });
      const addedItems = await tx.mdItem.createMany({ data: items, skipDuplicates: true });
      const customerCount = await tx.crmCustomer.count({ where: { systemCode, customerCode: { in: customers.map((row) => row.customerCode) } } });
      const productCount = await tx.mdItem.count({ where: { tenantId: app.tenantId, itemCode: { in: items.map((row) => row.itemCode) }, itemType: 'PRODUCT' } });
      if (customerCount !== 100 || productCount !== 200) throw new Error('TEST_DATA_COUNT_MISMATCH');
      return { addedCustomers: addedCustomers.count, addedProducts: addedItems.count, customerCount, productCount };
    });
    console.log(JSON.stringify({ systemCode, ...result }));
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
