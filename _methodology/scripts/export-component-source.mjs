import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspectDependencies } from './inspect-component-dependencies.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const inside = (root, file) => { const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };

export function exportComponentSource(root, component, destination) {
  const report = inspectDependencies(root, component.sourcePaths);
  if (report.unresolved.length) throw new Error('Unresolved source imports; inspect dependencies before exporting');
  // Validate and read everything before creating output; never follow a source symlink outside the repo.
  const canonicalRoot = fs.realpathSync(root);
  const files = report.files.map((name) => {
    const source = fs.realpathSync(path.join(root, name));
    if (!inside(canonicalRoot, source)) throw new Error(`Source escapes repository: ${name}`);
    const bytes = fs.readFileSync(source);
    return { name, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  const target = path.resolve(destination);
  fs.mkdirSync(target); // Exclusive creation; existing paths and missing parents are explicit failures.
  try {
    for (const file of files) {
      const output = path.join(target, 'source', file.name);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, file.bytes, { flag: 'wx' });
    }
    const manifest = {
      formatVersion: 1, component: component.code, name: component.name,
      createdAt: new Date().toISOString(), status: 'source-snapshot-not-adoption',
      files: files.map(({ name, sha256 }) => ({ source: name, destination: `source/${name}`, sha256 })),
      dependencies: report.packages, manualReview: report.manual, limits: report.limits,
    };
    fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(target, 'README.md'), `# ${component.code} 源码快照\n\n这不是已发布的软件包，也不代表目标项目采用通过。\n\n1. 对照 manifest.json 核对文件哈希和来源；source/ 保留原相对目录。\n2. 检查 dependencies 和 manualReview：包版本、项目契约、别名、隐式 JSX runtime、CSS 资源和宿主样式仍需适配。\n3. 安装目标项目所需依赖，处理业务数据、权限和后端协议；本工具不会自动安装或复制凭证。\n4. 完成目标工程类型/构建、相关交互和失败场景验证，记录实际输出。\n5. 源码变更后重新导出到新目录，对比哈希与适配差异，不覆盖已有接入工作。\n\n仅复制静态可解析的本地源码。许可证及第三方分发条件须由接入项目核对。\n`, { flag: 'wx' });
    return manifest;
  } catch (error) {
    // Only remove the new directory owned by this invocation, never pre-existing output.
    fs.rmSync(target, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [code, destination, ...extra] = process.argv.slice(2);
    if (!code || !destination || extra.length) throw new Error('Usage: node export-component-source.mjs CMP-01 /absolute/new-output-directory');
    const catalog = JSON.parse(fs.readFileSync(path.join(repository, '_methodology/components/index.json'), 'utf8'));
    const component = catalog.components.find((entry) => entry.code === code);
    if (!component) throw new Error('Unknown component code');
    const manifest = exportComponentSource(repository, component, destination);
    console.log(JSON.stringify({ component: code, destination: path.resolve(destination), files: manifest.files.length, status: manifest.status }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
