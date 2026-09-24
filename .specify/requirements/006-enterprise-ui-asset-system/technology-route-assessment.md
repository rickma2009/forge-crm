# 技术路线核对与建议

> 状态：recommended-awaiting-architecture-gate
> 决策输入：`REQSRC-031`、现有 `technologyProfile` 与可运行工作区

## 1. 已选并已运行的项目基线

| 层次 | 当前选择 | 当前用途 |
|---|---|---|
| 工作区 | pnpm 9 + Turbo 2 | contracts/server/web 的统一命令与依赖编排 |
| 语言 | TypeScript 5.7 | 浏览器、契约、服务端和检查脚本 |
| Web | React 19 + Vite 5 | 分类目录、演示门户和交互 Demo |
| 测试 | Vitest + Testing Library + jsdom | 组件、交互和 Registry 行为 |
| 图标 | Tabler Icons React | 统一图标来源，避免自绘资产 |
| 契约 | `@interaction-pattern-lab/contracts` + Zod | 需要运行时校验的共享边界 |
| 服务端 | NestJS 10 | 已批准导航、认证、字典和客户能力 |
| 数据 | PostgreSQL + Prisma 7 | 已批准的验证场系统数据，不承载 Demo 业务交易 |
| 样式 | CSS 变量 + 作用域类 | 现有企业视觉令牌和响应式实现 |

## 2. 本切片建议

- 继续使用 `typescript-enterprise-web` v0.2.0，不新增第二套框架。
- Schema、状态矩阵和验收保持技术栈中立并位于 `_methodology/`。
- React 实现留在 `interaction-pattern-lab/packages/web`，作为验证投影而非规范源。
- 场景数据继续使用确定性内存 Adapter；本切片不增加数据库表、API 或迁移。
- 复用现有表单控件和图标依赖；不引入 Ant Design、AG Grid、Tailwind、状态库或低代码引擎。
- 组件先在 Web 包内形成清晰目录和测试 seam；达到 `project-adopted` 且第二场景通过后再评估独立包。

## 3. 建议目录边界

```text
packages/web/src/ui-assets/
├── foundation/
├── components/
├── templates/
└── scenarios/
```

方法论对应资产仍位于：

```text
_methodology/templates/ui/
_methodology/reference-cases/
_methodology/examples/
_methodology/patterns/index.json
```

## 4. 未批准事项

- 是否采用上述目录；
- schema 解释器与 React 状态所有权；
- 可编辑行表的扩展 API；
- 是否把共享运行时 schema 放入 contracts 包；
- 任何独立发布或服务器数据能力。
