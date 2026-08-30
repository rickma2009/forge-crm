# Engineering Baseline

本文件由 `typescript-enterprise-web` Profile 生成。

## 启动

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
# 在 .env 中设置非空 POSTGRES_PASSWORD 和 DATABASE_URL；模板不提供可运行口令。
pnpm db:up
pnpm prisma:generate
pnpm dev
```

- Web：`http://127.0.0.1:5173`
- Server live check：`http://127.0.0.1:3000/api/health/live`
- Server ready check：`http://127.0.0.1:3000/api/health/ready`

live 只表示进程存活；ready 在 `DATABASE_URL` 缺失或 PostgreSQL 端点不可达时以 503 失败关闭。接入迁移、Schema 或其他关键依赖后，项目必须继续扩展 readiness 语义。

## 质量入口

```bash
pnpm verify
```

该命令执行 Prisma Client 生成、lint、typecheck、单元测试和生产构建，并在成功后更新本项目 Profile 验证状态。项目不依赖父工作台即可执行。数据库迁移、认证、租户、权限、审计、部署和恢复策略仍须通过项目 SDD 与 Gate 决策。

Profile v0.2 不预设格式化工具，以避免未经项目决策强加代码风格；首个业务切片开始前必须在工程规范中选择并记录格式化方案。
