# AGENTS.md

> {{project_name}} 的 AI 执行入口。

## 当前状态

- 当前为治理初始化阶段。
- `.specify/` 是批准后的业务和功能规格唯一事实源。
- Business、Specification、Architecture、Release Gate 均须由人类明确批准。

## 开始工作前

1. 检查并保留已有改动。
2. 阅读 `.specify/project-state.json` 和 `.specify/memory/constitution.md`。
3. 新输入先追加归档到 `.specify/sources/`，再转换为业务需求。
4. 未通过对应 Gate 时只允许研究、澄清和获授权的原型，不得实现或发布。

## 执行边界

- 禁止创建 `_spec/` 或第二份业务 Spec。
- 外部 Skill 只提供执行方法，不覆盖本项目事实源、宪法或 Gate。
- 不虚构测试、批准、部署或外部状态。
- 未经明确授权，不部署、不写生产数据、不执行破坏性操作。
- 只有项目独有、重复、可测试且无敏感配置的能力才成为项目本地 Skill。

## Agent skills

### Issue tracker

协作票据使用适配后的本地 `.scratch/`；`.specify/` 是批准规格唯一事实源。见 `docs/agents/issue-tracker.md`。

### Triage labels

使用 Matt 默认五状态词汇；`ready-for-agent` 仍受 SDD Gate 和 Definition of Ready 约束。见 `docs/agents/triage-labels.md`。

### Domain docs

采用单上下文薄词汇索引；完整业务事实位于 `.specify/memory/business-context.md`。见 `docs/agents/domain.md`。
