# AI 开发练习：何时复用 GitHub Actions 工作流

目标：让团队成员基于来源和现有工程，选择项目工作流、组织模板或可复用工作流，并说明为什么。预计 30—45 分钟。来源事实和项目决定见[候选案例](../../../_methodology/reference-cases/github-actions-workflow-reuse-candidate.md)。

## 练习材料

- Forge CRM 当前[CI 工作流](../../../.github/workflows/forge-crm.yml)；
- GitHub 官方[复用工作流](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)与[组织模板](https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates)；
- 本项目[采用记录模板](../../../_methodology/templates/ui/adoption-record-template.md)。

## 任务

1. 列出当前 CI 中哪些步骤属于项目专属检查，哪些可能在第二个 TypeScript 项目中重复。不要先写抽象文件。
2. 假设团队新增两个仓库：一个也是 pnpm workspace，另一个使用 Python。分别选择保留本地工作流、组织模板或可复用工作流；写出共享输入、依赖和应留在各仓库的检查。
3. 为 pnpm 仓库设计一个候选 `workflow_call` 接口草图：输入 Node 版本与验证命令，标明调用方负责的触发事件和最小权限。只需草图，不向本仓库 CI 接线。
4. 说明跨仓库引用为何需要固定版本，以及私有共享工作流的访问与日志风险。区分官方文档事实和自己的设计推断。
5. 填一份 `adopt / adapt / reject` 记录，说明当前 Forge CRM 为什么暂缓拆分；写出何种证据会让决定改变。

## 评审标准

答案应保留当前单仓 CI 可读性，不把“多仓库将来可能重复”写成已经发生；能区分组织模板的初始化作用与可复用工作流的运行时调用；说明输入、权限、版本和密钥边界；给出至少一个不应共享的项目专属检查。此练习不构成新工作流发布或跨仓库采用证据。
