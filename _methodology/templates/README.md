# SDD 通用模板

这些模板是新项目的唯一模板来源，技术栈中立，不继承 `_ref/` 中任何项目的历史约束。

## 项目级模板

- `AGENTS-template.md`
- `project-charter-template.md`
- `business-context-template.md`
- `constitution-template.md`
- `source-metadata-template.json`
- `requirements-package-README-template.md`
- `transformation-template.md`

## 功能级模板

- `requirements-original-template.md`
- `clarification-template.md`
- `spec-template.md`
- `testcases-template.md`
- `plan-template.md`
- `tasks-template.md`
- `traceability-template.md`
- `review-template.md`
- `pipeline-state-template.json`

## UI 与交互模板

- `ui/interaction-pattern-candidate-template.md`：页面、操作、展示、状态或特殊交互的候选登记卡，用于补齐适用边界、行为契约、风险、验收和来源证据。
- `ui/enterprise-navigation-shell/`：企业系统双层导航壳层，包含设计令牌、菜单配置骨架和接入/验收说明。
- `ui/record-management-workspace/`：列表—新增—详情记录管理工作区，包含路由/字段配置骨架、设计令牌和验收清单。

新项目优先使用 `node _methodology/scripts/forge.mjs init ...` 建立治理骨架；这些文件继续作为人工定制和功能切片模板。使用时替换 `{{placeholder}}`，未替换占位符时不得通过交付质量门禁。
