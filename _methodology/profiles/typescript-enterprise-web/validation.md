# typescript-enterprise-web v0.2 验证记录

> 资产状态：`implementation-verified`
> 验证日期：2026-08-31
> 环境：Node.js v24.16.0、pnpm 9.15.0、macOS 临时隔离目录

## 验证过程

1. `forge init` 生成独立治理骨架；
2. 生成带管理副本、SHA-256、metadata 审批字段和登记册记录的隔离测试批准来源；
3. `forge apply-profile ... typescript-enterprise-web` 生成完整工程；
4. 使用生成的 `pnpm-lock.yaml` 安装依赖；
5. 运行 `pnpm verify`。

## 真实结果

- Prisma Client 从空业务 Schema 生成成功；
- ESLint：Server 与 Web 通过；
- TypeScript：Server 与 Web 通过；
- Jest：NestJS live 与 fail-closed ready health 2/2 通过；
- Vitest：React 起步页 1/1 通过；
- NestJS 生产构建通过，生成 `packages/server/dist/main.js`；
- Vite 生产构建通过，生成 `packages/web/dist/index.html`。
- 以 `PORT=3137` 启动生成的 NestJS 制品后，`GET /api/health/live` 实际返回 `{"status":"ok","service":"generated-enterprise-app-server"}`。
- 验证完成后记录工程文件指纹；状态文字缺少指纹或验证后工程发生变化时，检查器会拒绝 `verified`。

验证期间先发现 Web `tsconfig.node.json` 的 `allowImportingTsExtensions` 与 emit 模式冲突；修复后重新执行全链并通过。此记录证明生成工程链可运行，不证明数据库迁移、认证、权限、业务功能、部署或 Release。

## 可复现入口

```bash
node _methodology/scripts/test-generated-profile.mjs
# 或同时执行全部离线检查：
bash _methodology/scripts/verify-all-online.sh
```

该集成测试需要首次访问 npm registry；常规 `verify-workbench.sh` 只运行无网络的结构和防覆盖测试。
