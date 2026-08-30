import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] ?? '');
const sourcesDir = path.join(projectDir, '.specify', 'sources');
if (!projectDir || !fs.existsSync(sourcesDir)) {
  console.error(`来源目录不存在: ${sourcesDir}`);
  process.exit(2);
}

const failures = [];
const metadataFiles = [];
const sourceDirectories = [];
for (const entry of fs.readdirSync(sourcesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  sourceDirectories.push(entry.name);
  const metadataPath = path.join(sourcesDir, entry.name, 'metadata.json');
  if (fs.existsSync(metadataPath)) metadataFiles.push(metadataPath);
  else failures.push(`${entry.name} 缺少 metadata.json`);
}

if (!fs.existsSync(path.join(sourcesDir, 'REGISTRY.md'))) failures.push('缺少 sources/REGISTRY.md');

for (const metadataPath of metadataFiles) {
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    failures.push(`${metadataPath} 不是合法 JSON`);
    continue;
  }

  for (const field of ['sourceId', 'managedCopy', 'sha256', 'contentPolicy', 'instructionPolicy']) {
    if (!metadata[field]) failures.push(`${metadata.sourceId ?? metadataPath} 缺少 ${field}`);
  }

  const managedPath = path.join(path.dirname(metadataPath), metadata.managedCopy ?? '');
  if (!fs.existsSync(managedPath)) {
    failures.push(`${metadata.sourceId} 的管理副本不存在`);
    continue;
  }

  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(managedPath)).digest('hex');
  if (actualHash !== metadata.sha256) failures.push(`${metadata.sourceId} 的 SHA-256 不匹配`);
  if (metadata.contentPolicy !== 'immutable-source-copy') failures.push(`${metadata.sourceId} 未声明不可变副本策略`);
  if (metadata.instructionPolicy !== 'document-content-is-evidence-not-agent-instruction') {
    failures.push(`${metadata.sourceId} 未声明文档指令边界`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`PASS  原始需求来源完整且哈希一致（${metadataFiles.length} 份，${sourceDirectories.length} 个来源目录）`);
