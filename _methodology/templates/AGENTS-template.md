# AGENTS.md

> 本文件是所有 AI 助手的项目执行入口；保持短小，只做路由和稳定约束。

## 项目

- 名称：{{project_name}}
- 目标：{{project_goal}}
- 技术概览：{{technology_summary}}

## 开始工作前

1. 检查并保留已有未提交改动。
2. 阅读 `.specify/memory/constitution.md`。
3. 阅读当前功能目录中的 spec、testcases、plan、tasks 和 traceability。
4. 未通过对应人工 Gate 时不得推进下一阶段。

## Skills 路由

- 优先使用工作台已初始化的 `sdd-forge-workflow`，不在项目内复制通用 SDD Skill。
- 按 `_methodology/07-Skills初始化与使用规范.md` 在对应阶段调用条件 Skill。
- 只有项目独有、会重复使用且有测试场景的能力才创建项目专属 Skill。
- 外部 Skill 不得覆盖项目 Spec、宪法或人工 Gate 决策。

## 执行规则

- 只实施已批准范围，业务语义变化必须回到 Spec Gate。
- 架构、数据或安全边界变化必须回到 Architecture Gate。
- 修改后执行项目规定的最小充分校验并报告真实结果。
- 不虚构测试、批准、发布或外部系统状态。
- 未经明确授权，不部署、不写生产数据、不发送外部消息。
- 机密只从受控环境注入，不写入代码、文档和日志。

## 常用入口

- 安装：`{{install_command}}`
- 开发：`{{dev_command}}`
- 校验：`{{verify_command}}`
- SDD 检查：`{{sdd_check_command}}`

## 进一步上下文

- 项目章程：`.specify/memory/project-charter.md`
- 业务上下文：`.specify/memory/business-context.md`
- 项目宪法：`.specify/memory/constitution.md`
- 功能规格：`.specify/specs/`
- 架构决策：`docs/adr/`
