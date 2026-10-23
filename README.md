# Forge CRM

Forge CRM 是一个由 AI 辅助、持续迭代的企业客户与销售管理案例项目。当前仓库已从早期 SDD 方法论验证场演进为可运行的 CRM 应用；历史验证材料继续作为可追溯证据保留，但不再代表产品名称或代码包身份。

长期目标是把每次开发中得到验证的页面交互、技术约定和公共能力，提炼为其他项目可采用的方法论、模板、组件与插件，并把有来源、有边界、有验收证据的案例用于团队 AI 开发培训。目标与执行准则见[项目章程](.specify/memory/project-charter.md)和[AI 开发执行入口](AGENTS.md)；资产成熟度随项目验证持续更新。

本机启动：

```bash
bash start.sh
```

启动后访问 [http://localhost:5173/](http://localhost:5173/)。首次准备、原数据库兼容策略及故障处理见 [docs/local-start.md](docs/local-start.md)。

## 工程结构

```text
forge-crm/
├── packages/
│   ├── web/          # React + Vite 前端
│   ├── server/       # NestJS + Prisma 服务端
│   ├── contracts/    # 前后端共享 Zod 契约
│   └── tsconfig/     # 共享 TypeScript 配置
├── .specify/         # 当前需求、规格、Gate 与来源证据
├── _methodology/     # SDD 治理、模板、模式与自动检查
├── _ref/             # 只读参考素材
├── docs/             # 架构、数据库和运行文档
├── scripts/          # 工程验证与维护脚本
├── compose.yaml
└── start.sh
```

根目录是 CRM 应用工程，使用 pnpm workspace。`_methodology/` 是治理层和可复用资产的唯一规范源；`_ref/` 仅提供只读证据，不直接成为项目规则。

团队练习入口：[AI 开发案例](docs/training/README.md)。每个案例明确来源、验证状态和可复用边界。

跨项目组件接入：[快速指南](_methodology/components/quickstart.md)，串联依赖检查、源码导出、隔离演练、目标工程适配与证据复审。

## 开发与验证

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm verify
bash _methodology/scripts/verify-all.sh
```

主要技术栈：React 19、Vite、NestJS、Prisma、PostgreSQL、TypeScript、Vitest/Jest。

## SDD 工作方式

业务需求、验收标准、技术方案、测试和实现通过 `.specify/` 中的稳定 ID 追溯。工作流采用 Business、Specification、Architecture、Release 四类 Gate，AI 不虚构人工批准或发布状态。详细规则见：

- [_methodology/00-搭建指南.md](_methodology/00-搭建指南.md)
- [_methodology/03-SDD规范与质量门禁.md](_methodology/03-SDD规范与质量门禁.md)
- [_methodology/04-需求追溯规范.md](_methodology/04-需求追溯规范.md)
- [_methodology/11-数据库设计与数据分层规范.md](_methodology/11-数据库设计与数据分层规范.md)
- [AGENTS.md](AGENTS.md)

`sdd-forge-workflow`、`.sdd-forge.json` 等名称属于方法论协议和兼容接口，本次产品改名不改变这些治理标识。

## 改名兼容说明

应用、仓库与 npm 包统一使用 `Forge CRM` / `forge-crm` / `@forge-crm/*`。为保护已有本地数据，Compose 项目名、PostgreSQL 容器、数据卷和数据库账号暂时保留早期 `interaction-pattern-lab` 身份；不要仅因产品改名而重建或删除数据卷。
