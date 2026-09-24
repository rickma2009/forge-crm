import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] ?? '');
const allowLegacyUnmanaged = process.argv.includes('--allow-legacy-unmanaged');
const sourcesDir = path.join(projectDir, '.specify', 'sources');
if (!projectDir || !fs.existsSync(sourcesDir)) {
  console.error(`来源目录不存在: ${sourcesDir}`);
  process.exit(2);
}

const failures = [];
const metadataFiles = [];
const sourceDirectories = [];
const sourceRecords = [];
const legacyDirectories = [];
for (const entry of fs.readdirSync(sourcesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  sourceDirectories.push(entry.name);
  const metadataPath = path.join(sourcesDir, entry.name, 'metadata.json');
  if (fs.existsSync(metadataPath)) metadataFiles.push(metadataPath);
  else if (allowLegacyUnmanaged) legacyDirectories.push(entry.name);
  else failures.push(`${entry.name} 缺少 metadata.json`);
}

const registryPath = path.join(sourcesDir, 'REGISTRY.md');
const registryRecords = [];
if (!fs.existsSync(registryPath)) {
  failures.push('缺少 sources/REGISTRY.md');
} else {
  let managedCopyColumn = null;
  for (const line of fs.readFileSync(registryPath, 'utf8').split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, ''));
    if (cells.includes('管理副本')) {
      managedCopyColumn = cells.indexOf('管理副本');
      continue;
    }
    if (!/^REQSRC-\d+$/.test(cells[0] ?? '')) continue;
    registryRecords.push({ sourceId: cells[0], managedCopy: managedCopyColumn === null ? null : cells[managedCopyColumn] ?? '' });
  }
}

function assertUnique(records, key, label) {
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record[key])) failures.push(`REGISTRY.md 存在重复 ${label}: ${record[key]}`);
    seen.add(record[key]);
  }
}

assertUnique(registryRecords, 'sourceId', 'sourceId');
assertUnique(registryRecords.filter((record) => record.managedCopy !== null), 'managedCopy', 'managed-copy');

for (const metadataPath of metadataFiles) {
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    failures.push(`${metadataPath} 不是合法 JSON`);
    continue;
  }

  const missingFields = ['sourceId', 'managedCopy', 'sha256', 'contentPolicy', 'instructionPolicy']
    .filter((field) => !metadata[field]);
  if (missingFields.length > 0) {
    if (allowLegacyUnmanaged) {
      legacyDirectories.push(path.basename(path.dirname(metadataPath)));
      continue;
    }
    for (const field of missingFields) failures.push(`${metadata.sourceId ?? metadataPath} 缺少 ${field}`);
    continue;
  }

  const managedPath = path.join(path.dirname(metadataPath), metadata.managedCopy ?? '');
  if (!fs.existsSync(managedPath) || !fs.statSync(managedPath).isFile()) {
    failures.push(`${metadata.sourceId} 的管理副本不存在`);
    continue;
  }

  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(managedPath)).digest('hex');
  if (actualHash !== metadata.sha256) failures.push(`${metadata.sourceId} 的 SHA-256 不匹配`);
  if (metadata.contentPolicy !== 'immutable-source-copy') failures.push(`${metadata.sourceId} 未声明不可变副本策略`);
  if (metadata.instructionPolicy !== 'document-content-is-evidence-not-agent-instruction') {
    failures.push(`${metadata.sourceId} 未声明文档指令边界`);
  }
  sourceRecords.push({
    directoryName: path.basename(path.dirname(metadataPath)),
    sourceId: metadata.sourceId,
    managedCopy: metadata.managedCopy,
  });
}

assertUnique(sourceRecords, 'sourceId', 'metadata sourceId');

const sourceById = new Map(sourceRecords.map((record) => [record.sourceId, record]));
const registryById = new Map(registryRecords.map((record) => [record.sourceId, record]));
for (const source of sourceRecords) {
  const registry = registryById.get(source.sourceId);
  if (!registry && !allowLegacyUnmanaged) {
    failures.push(`${source.sourceId} 的来源目录未在 REGISTRY.md 登记`);
    continue;
  }
  if (registry?.managedCopy !== null && registry) {
    const expectedManagedCopy = path.posix.join(source.directoryName, source.managedCopy);
    if (registry.managedCopy !== expectedManagedCopy) {
      failures.push(`${source.sourceId} 的 REGISTRY managed-copy 与 metadata 不一致: ${registry.managedCopy}`);
    }
  }
}

for (const registry of registryRecords) {
  const source = sourceById.get(registry.sourceId);
  if (registry.managedCopy !== null) {
    const registryManagedPath = path.resolve(sourcesDir, registry.managedCopy);
    const relativeManagedPath = path.relative(sourcesDir, registryManagedPath);
    const isProjectRelative = relativeManagedPath && !relativeManagedPath.startsWith('..');
    if (!isProjectRelative || !fs.existsSync(registryManagedPath)) {
      failures.push(`${registry.sourceId} 的 REGISTRY managed-copy 不存在: ${registry.managedCopy}`);
    }
  }
  if (!source && !allowLegacyUnmanaged) {
    failures.push(`${registry.sourceId} 的 REGISTRY 条目没有对应来源目录`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

const legacySuffix = allowLegacyUnmanaged ? `；兼容跳过 ${new Set(legacyDirectories).size} 个旧格式目录` : '';
console.log(`PASS  原始需求来源完整且哈希一致（${sourceRecords.length} 份受管来源，${sourceDirectories.length} 个来源目录${legacySuffix}）`);
