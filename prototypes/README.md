# 原型工作区

本项目所有新增交互原型统一放在根目录 `prototypes/<feature-name>/`，功能目录使用英文 kebab-case。正式应用代码仍在 `packages/`，独立运行服务在 `services/`；原型不得放入这些正式源码目录。

## 原型索引

| 原型 | 状态 | 入口与运行 | 关联方案 |
|---|---|---|---|
| [approval-workflow](approval-workflow/README.md) | P1完成，待用户体验确认 | 独立端口5174，详见目录README | [审批流程方案](../docs/design/approval-workflow/solution.md) |
| [digital-employee](digital-employee/README.md) | 制造业场景规划原型完成 | 独立端口5175；主框架顶部“数字员工”入口 | [数字员工产品规划](../docs/design/digital-employee/product-plan.md) |
| [mobile-workspace](mobile-workspace/README.md) | 移动交互原型，P0/P1模拟体验 | 独立端口5176，手机竖屏预览，全部模拟数据 | [移动设计方案](../docs/design/mobile-workspace/solution.md) |

## 目录约定

```text
prototypes/
  README.md                    # 原型索引与公共约定
  <feature-name>/
    README.md                  # 目的、范围、启动、演示账号/场景、限制、关联方案
    package.json               # 独立脚本；依赖复用策略明确
    index.html                 # 原型入口
    src/                       # 原型界面与模拟逻辑，复杂时拆mock/与components/
    tests/                     # 最小相关模型/交互测试
    start.sh / stop.sh          # 独立运行时提供，端口冲突报错
    .gitignore                 # 排除dist、运行日志、PID等产物
    dist/                      # 构建生成，不提交
    .runtime/                  # 本地日志与PID，不提交
```

- 详细需求/规格继续归档 `.specify/`，方案在 `docs/design/`；原型README用链接连接，避免多份方案互相覆盖。
- 原型可直接引用现有公共组件与样式，复用方向仅为“原型 → 正式公共组件”；正式应用不得反向导入原型。
- 不为原型改生产路由、菜单、权限、数据库、种子数据；若需要集成式预览入口，必须有明确授权且保持模拟数据隔离。
- 数据默认使用目录内fixture和命名隔离的浏览器存储，提供清空/恢复演示数据。不能包含真实客户数据、密钥、生产凭证或无标签的真实业务操作。
- 独立服务仅绑定本机，明确端口，不能占用或停止正式服务；运行时产物不提交。当前审批原型占用5174，后续原型须在索引登记端口并检查冲突。
- 有交互的按钮必须产生可解释结果；未实现功能明确禁用或不显示，不能假装服务端保存成功。
- 页面沿用 `_methodology/style-index.md` 及现有公共组件；任何原型级简化必须在README/规格中写清。
- 验证按影响范围选择最低适当等级：纯静态文案L1，隔离交互原型通常L2，接触真实权限/业务/数据库才按风险升级。
- 用户确认后，按正式切片把经过确认的行为实现到生产模块，并补齐权限、接口、持久化、并发和测试。不可仅把mock目录挪进 `packages/` 就称作生产交付。
- 原型完成后更新索引状态与验证证据。旧原型按具体任务逐项迁移，不因本规则自动移动既有代码。

来源：[2026-10-05用户要求](../.specify/sources/20261005-unified-prototype-directory/source.md)。本规则针对本仓库，不声明跨项目强制采用。

审批原型支持主框架内嵌：开发服务5173与审批原型5174同时启动，首页旁点击“审批中心”。预览代码保持隔离；详情使用宿主工作区页签。详见[启动与边界](approval-workflow/README.md#主框架嵌入预览)。
