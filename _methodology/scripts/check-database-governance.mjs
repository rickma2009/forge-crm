import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const failures = [];

const requiredFiles = [
  '_methodology/11-数据库设计与数据分层规范.md',
  '_methodology/profiles/typescript-enterprise-web/database-conventions.md',
  '_methodology/database-table-registry.json',
  '_methodology/templates/AGENTS-template.md',
  '_methodology/project-init/templates/AGENTS.md',
  '_methodology/templates/plan-template.md',
  '_methodology/examples/000-golden-slice-customer-lead/plan.md',
  'AGENTS.md',
];

function read(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`缺少数据库治理文件: ${relative}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

for (const relative of requiredFiles) read(relative);

function requireText(relative, expected) {
  const content = read(relative);
  if (!content.includes(expected)) failures.push(`${relative} 缺少约束引用: ${expected}`);
}

requireText('AGENTS.md', '_methodology/11-数据库设计与数据分层规范.md');
requireText('AGENTS.md', '_methodology/database-table-registry.json');
requireText('_methodology/templates/AGENTS-template.md', '_methodology/11-数据库设计与数据分层规范.md');
requireText('_methodology/project-init/templates/AGENTS.md', '_methodology/11-数据库设计与数据分层规范.md');
requireText('_methodology/templates/plan-template.md', '数据分层与表登记');
requireText('_methodology/examples/000-golden-slice-customer-lead/plan.md', '数据库规范适用性');
requireText('_methodology/profiles/typescript-enterprise-web/database-conventions.md', '@@map');
requireText('_methodology/11-数据库设计与数据分层规范.md', '共享使用不等于共享写入');
for (const relative of [
  'AGENTS.md',
  '_methodology/11-数据库设计与数据分层规范.md',
  '_methodology/profiles/typescript-enterprise-web/database-conventions.md',
  '_methodology/templates/AGENTS-template.md',
  '_methodology/project-init/templates/AGENTS.md',
]) {
  requireText(relative, '小写 `snake_case`');
  requireText(relative, '32 个字符');
}

let registry;
try {
  registry = JSON.parse(read('_methodology/database-table-registry.json'));
} catch {
  failures.push('_methodology/database-table-registry.json 不是合法 JSON');
}

if (registry) {
  const allowedPrefixes = new Set((registry.allowedPrefixes ?? []).map((entry) => entry.prefix));
  const requiredEnterprisePrefixes = ['sys_', 'org_', 'md_', 'sd_', 'scm_', 'rd_', 'fin_'];
  for (const prefix of requiredEnterprisePrefixes) {
    if (!allowedPrefixes.has(prefix)) failures.push(`缺少企业批准的数据前缀: ${prefix}`);
  }

  const forbiddenLegacyPrefixes = ['iam_', 'ui_', 'crm_', 'mdm_'];
  for (const prefix of forbiddenLegacyPrefixes) {
    if (allowedPrefixes.has(prefix)) failures.push(`遗留前缀不得成为新表允许前缀: ${prefix}`);
  }

  if (registry.physicalIdentifierConvention !== 'lower_snake_case') {
    failures.push('物理标识符规则必须为 lower_snake_case');
  }
  if (registry.maxIdentifierLength !== 32) failures.push('物理表名和字段名长度上限必须为 32');

  const legacyTables = (registry.legacyExceptions ?? []).map((entry) => entry.table);
  const approvedBusinessTables = registry.approvedBusinessTables ?? [];
  const duplicateNames = [...legacyTables, ...approvedBusinessTables].filter(
    (name, index, all) => all.indexOf(name) !== index,
  );
  for (const name of new Set(duplicateNames)) failures.push(`数据库表登记重复: ${name}`);

  const isValidPhysicalIdentifier = (identifier) =>
    identifier.length <= registry.maxIdentifierLength && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(identifier);
  for (const table of approvedBusinessTables) {
    if (!isValidPhysicalIdentifier(table)) {
      failures.push(`登记的新业务表必须为不超过 32 个字符的小写 snake_case: ${table}`);
    }
  }

  const prismaPath = path.join(root, 'packages/server/prisma/schema.prisma');
  if (fs.existsSync(prismaPath)) {
    const schema = fs.readFileSync(prismaPath, 'utf8');
    const mappedTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]);
    const registered = new Set([...legacyTables, ...approvedBusinessTables]);
    for (const table of mappedTables) {
      if (!isValidPhysicalIdentifier(table)) {
        failures.push(`Prisma 物理表名必须为不超过 32 个字符的小写 snake_case: ${table}`);
      }
      const matchesApprovedPrefix = [...allowedPrefixes].some((prefix) => table.startsWith(prefix));
      if (!matchesApprovedPrefix && !registered.has(table)) {
        failures.push(`Prisma 物理表未登记数据层级: ${table}`);
      }
    }

    for (const modelMatch of schema.matchAll(/model\s+\w+\s*\{([\s\S]*?)\n\}/g)) {
      const body = modelMatch[1];
      const table = body.match(/@@map\("([^"]+)"\)/)?.[1];
      if (!table || legacyTables.includes(table)) continue;
      for (const rawLine of body.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
        const field = line.match(/^(\w+)\s+(\S+)/);
        if (!field) continue;
        const [, fieldName, fieldType] = field;
        if (fieldType.endsWith('[]') || line.includes('@relation(')) continue;
        const physicalField = line.match(/@map\("([^"]+)"\)/)?.[1] ?? fieldName;
        if (!isValidPhysicalIdentifier(physicalField)) {
          failures.push(`Prisma 物理字段名必须为不超过 32 个字符的小写 snake_case: ${table}.${physicalField}`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log('PASS  数据库分层规范、AGENTS 路由、模板、金标准案例和物理表登记一致');
