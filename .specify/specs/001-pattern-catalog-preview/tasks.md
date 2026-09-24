# 实现任务：模式目录与交互预览

> 功能编号：001-pattern-catalog-preview  
> Architecture Gate：approved（`REQSRC-004`）  
> 执行策略：test-first；每项只有在真实证据存在后才标记 completed。

| ID | 任务 | 关联需求/验收 | 验证证据 | 状态 |
|---|---|---|---|---|
| `TASK-001` | 建立 React/TypeScript/Vite 静态应用骨架、锁定依赖和 `lint/typecheck/test/build/verify` 命令 | `NFR-003`、`AC-008` | `pnpm-lock.yaml`、`pnpm verify` | completed |
| `TASK-002` | 先写失败测试，再实现 Pattern Catalog、搜索归一、稳定选择和来源指纹检查 | `FR-001`、`FR-002`、`FR-004`；`AC-001`—`AC-003`、`AC-006` | 预期红灯记录；catalog/App 自动测试；投影校验 | completed |
| `TASK-003` | 先写失败测试，再实现工作台壳层、URL 定位、原型/说明页签、切换与统一重置 | `FR-002`、`FR-005`；`AC-003`、`AC-007` | App 自动测试与浏览器 URL/重置验收 | completed |
| `TASK-004` | 先写失败测试，再实现企业双层导航 Demo Adapter | `FR-003`；`AC-004` | NavigationShellDemo 自动测试与浏览器验收 | completed |
| `TASK-005` | 先写失败测试，再实现记录管理工作区 Demo Adapter | `FR-003`；`AC-005` | RecordWorkspaceDemo 自动测试与浏览器验收 | completed |
| `TASK-006` | 实现完整模式说明、加载/空/错误状态、错误隔离和重试 | `FR-004`；`AC-006`、`AC-011` | App/DemoBoundary 自动测试 | completed |
| `TASK-007` | 完成键盘、窄屏、非持久化、无生产网络和项目级自动校验 | `NFR-001`—`NFR-005`；`AC-008`—`AC-010` | `pnpm verify`、agent-browser 与 `evidence/` | completed |
| `TASK-008` | 执行需求追溯、代码安全、集成运行三视角评审并回填测试/追溯证据 | 全部 | `review.md`、执行证据、SDD 全量检查通过 | completed |
| `TASK-009` | 先写失败测试，再将平台目录改为企业双层导航壳层并完成桌面/窄屏回归 | `FR-001`；`AC-001`、`AC-002`、`AC-009`、`AC-010`、`AC-012` | App 自动测试、`REQSRC-006`、浏览器截图与回归记录 | completed |

## 执行约束

1. 测试先于对应实现落盘，并至少观察一次预期失败；
2. Demo 数据必须是去业务化占位样例，不复制 MCRM 客户、角色或接口；
3. `_methodology/` 资产只读，投影变更必须显式更新来源指纹；
4. 浏览器测试通过不等于 Release Gate 批准；本切片不部署。
