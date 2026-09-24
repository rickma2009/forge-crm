# ADR-007：Forge CRM 项目身份迁移

状态：本地工程迁移已实施；目录移动与远程发布待最后执行
日期：2026-09-25
来源：REQSRC-073

## 背景

根仓库已经从交互验证场演进为具体 CRM 应用工程，但目录、npm 包和部分活动脚本仍使用 `sdd-forge` 或 `interaction-pattern-lab` 产品标识。与此同时，`sdd-forge` 仍是仓库内治理方法及兼容元数据的稳定名称，历史来源和证据不得改写。

## 决策

1. 当前产品与应用工程统一命名为 **Forge CRM**；仓库、目录和根 package 使用 `forge-crm`。
2. 内部 workspace 包统一使用 `@forge-crm/*`；包仍保持 `private: true`。
3. `sdd-forge-workflow`、`.sdd-forge.json`、`.sdd-forge/` 和历史来源继续作为方法论或兼容标识保留。
4. `.specify/sources/`、完成态 Gate、历史证据和旧 schema 身份不做追溯性改写。
5. 当前 README、AGENTS、页面标题、CI、启动说明及活动脚本必须反映 Forge CRM 当前结构。
6. PostgreSQL 数据库名、用户、容器和数据卷在本次迁移中保持不变；Compose 显式固定旧项目身份，防止目录改名后创建空库。
7. `pnpm-lock.yaml` 原位更新，不删除和重新解析无关依赖。
8. GitHub 与 Gitee 远程创建和首次推送必须在本地基线、改名提交和完整验证后进行；默认不擅自公开仓库。

## 后果

- workspace 包名属于内部破坏性变更，所有活动 import、配置和校验脚本必须原子更新；
- 旧产品名仍会存在于历史档案和数据库兼容标识中，旧名称扫描必须使用允许清单而不是要求全仓库为零；
- 目录移动后需重新打开 Codex、IDE 与终端；
- 数据库基础设施若以后也要改名，必须另立备份、迁移和恢复任务。

## 回滚

目录移动前可回滚改名提交；目录移动后先移回原目录，再回滚该提交。数据库身份未变，因此不需要数据回滚。

## 实施证据

- 改名前基线提交：`b4f3214`；
- `@forge-crm/*` 身份约束、启动兼容测试与 Compose 配置检查通过；
- `pnpm verify` 通过：contracts 37 项、web 252 项、server 107 项通过且 46 项按既有条件跳过；
- `_methodology/scripts/verify-workbench.sh` 与迁移兼容的项目治理校验通过；36 个旧格式来源目录被明确报告为兼容跳过，不伪装成已补齐 metadata；
- 原容器 `interaction-pattern-lab-postgres-1` 正在运行并挂载原数据卷，`pg_isready` 通过，public schema 可见 66 张表；
- 已知非阻断告警保持不变：ResourceMenuPage 测试存在 React `act(...)` 警告，前端生产包存在大于 500 kB 的 chunk。
