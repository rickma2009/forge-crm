# GitHub Actions 工作流复用：来源萃取与本项目判断

> 资产类型：外部官方资料参考案例；状态：`candidate`，未在多个仓库实施。  
> 来源核对：2026-10-03，GitHub Docs 的[复用工作流](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)、[工作流配置复用参考](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)、[组织工作流模板](https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates)和[组织内共享限制](https://docs.github.com/en/actions/how-tos/reuse-automations/share-with-your-organization)。

## 要解决的问题

团队有多个仓库时，CI 安装、验证、安全权限和升级策略容易各写一份，导致标准漂移。但只有一条工作流的仓库也可能因过早抽象而增加调用层级、权限配置和故障定位成本。本案例用于决定何时保留项目工作流、何时用组织模板起步、何时抽取可复用工作流。

## 来源事实与本项目推断

| 类型 | 内容 |
|---|---|
| 官方文档事实 | 可复用工作流存放在 `.github/workflows`，通过 `workflow_call` 暴露；调用发生在 job 的 `uses`，不是 step。可定义输入与密钥。见[复用工作流](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)。 |
| 官方文档事实 | 同仓库调用可引用本仓库工作流；跨仓库可用仓库路径与 ref，官方建议使用提交 SHA 固定外部工作流版本。调用方的 `GITHUB_TOKEN` 权限不会在被调用或嵌套工作流中升高。见[复用工作流](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)和[配置参考](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)。 |
| 官方文档事实 | 组织工作流模板存于组织的 `.github` 仓库 `workflow-templates` 目录，并配同名 `.properties.json` 元数据；它帮助新仓库创建初始工作流。见[创建组织工作流模板](https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates)。 |
| 官方文档事实 | 私有仓库向其他仓库共享 Actions 工作流需配置访问策略；GitHub 提醒外部协作者可能间接看到共享仓库工作流运行日志。见[组织内共享](https://docs.github.com/en/actions/how-tos/reuse-automations/share-with-your-organization)。 |
| Forge CRM 当前事实 | `.github/workflows/forge-crm.yml` 只有一个 `verify` job，安装依赖并运行工程校验；仓库内未出现第二条重复 CI 工作流。 |
| 本项目判断 | 当前先保留单文件 CI。若后续两个以上独立项目重复相同的确定性校验步骤，再评审组织模板或可复用工作流；此阈值是本项目的复审触发条件，不是 GitHub 官方规定。 |

## 可迁移的决策边界

- **组织模板**适合新仓库的起步默认值，生成后各仓库可以按自身技术栈调整；模板本身不保证生成后的项目持续同步。
- **可复用工作流**适合多仓库必须共同维护、输入和权限契约稳定的验证逻辑；调用方仍应明确触发条件、所需权限、依赖与本仓库专属检查。
- **项目本地工作流**适合只有一个使用者或项目差异尚大的情况。不要为“统一”把业务项目特有的数据库、环境变量和发布权限硬塞入共享工作流。
- 跨仓库共享须评审私有仓库访问、日志可见性、密钥流转、runner 与版本固定方式。工作流模板和可复用工作流是两类资产，不应混称。

## Forge CRM 采用决定

`reject-now`：不立即拆分现有 `.github/workflows/forge-crm.yml`。保留其可验证的 `pnpm verify` 和项目来源检查，避免没有第二个消费者时引入调用层。`candidate-later`：把“通用 Node/pnpm 安装与校验合同”列为候选，待另一个独立项目实际接入、记录差异和运行结果后，再决定是组织模板还是可复用工作流。未部署组织级 `.github` 仓库，也未配置跨仓库访问。

## 培训与下一证据

培训练习见[团队案例](../../docs/training/cases/github-actions-reuse-decision.md)。下一成熟度至少需要第二个真实仓库的采用记录、固定版本、权限审查和 CI 运行证据；仅凭 GitHub 官方示例或本仓库单条工作流不能宣称团队标准已落地。
