# 技术计划：模式目录与交互预览

> 功能编号：001-pattern-catalog-preview  
> 状态：approved  
> Architecture Gate：approved（`REQSRC-004`）

## 1. 输入与约束

- 关联 Spec：`spec.md`，Specification Gate 已批准；
- 关联原型：`prototype.md`；
- 关联测试：`testcases.md`；
- 架构决策：`docs/adr/ADR-001-交互模式工作台前端架构.md`；
- 项目宪法：Demo 无生产调用、无业务数据持久化，方法论仍是通用规范源；
- 首批内容：仅两个 `validated-once` 种子模式；
- 技术边界：单包静态 Web 应用，无后端、数据库、登录和在线编辑。

## 2. 方案概述

使用 React、TypeScript 和 Vite 建立静态工作台。模式目录 Module 提供模式检索和按 ID 选择；Demo Registry 把两个模式 ID 映射到两个懒加载 Demo Adapter；页面状态只包含搜索词、当前模式、当前页签和重置实例号。

方法论 Markdown 与模板保持权威。应用维护带来源引用和指纹的展示投影，在校验阶段检查来源存在、内容指纹、编号、验证状态和必填说明，防止 Demo 与方法论静默漂移。

## 3. 架构分解

```text
_methodology patterns/templates/examples
            │ 来源引用 + 指纹校验
            ▼
Pattern Catalog Module ────── URL Selection Module
            │                         │
            └──────── App Shell ──────┘
                         │
                 Demo Adapter seam
                  ├── Navigation Demo
                  └── Record Workspace Demo
```

### 3.1 Module 与职责

| Module | Interface | 隐藏的实现复杂度 | 测试表面 |
|---|---|---|---|
| Pattern Catalog | 查询列表、按 ID 获取定义 | 搜索归一、排序、分类、必填字段、来源与状态 | 同一查询和读取接口 |
| URL Selection | 读取/写入当前模式 ID | 非法 ID 回退、历史记录和地址同步 | URL 输入与选中结果 |
| Demo Registry | 按模式 ID 获取 Demo Adapter | 懒加载、未知模式和 Adapter 映射 | 两个真实 Adapter |
| Demo Boundary | 渲染案例、捕获失败、触发重试 | 错误恢复与实例生命周期 | 成功、失败、重试 |
| Navigation Demo | 无参数可渲染 Demo | 展开、搜索、折叠、当前项和内部样例 | 用户声明交互 |
| Record Workspace Demo | 无参数可渲染 Demo | 查询、新增、详情、页签和内部样例 | 用户声明交互 |

重置不增加案例专属接口：工作台改变当前 Demo 的实例键，使 Adapter 重新挂载并恢复预置状态。

## 4. 工程结构

Architecture Gate 已批准，按以下结构创建：

```text
interaction-pattern-lab/
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig*.json
├── eslint.config.js
├── scripts/
│   └── validate-pattern-projection.mjs
├── src/
│   ├── app/
│   ├── catalog/
│   ├── demos/navigation-shell/
│   ├── demos/record-workspace/
│   ├── styles/
│   └── test/
└── docs/adr/
```

项目继续由 SDD Forge 根仓库跟踪，不初始化新的嵌套 Git 仓库。构建产物和依赖目录不进入版本库。

## 5. 数据设计

### 5.1 PatternDefinition

| 字段 | 用途 | 来源/约束 |
|---|---|---|
| `id` | 稳定模式 ID | 方法论分类编号，唯一 |
| `name`、`category` | 目录与模式头 | 方法论名称与分类 |
| `validationStatus` | 展示证据等级 | 只允许方法论枚举 |
| `keywords` | 首期搜索 | 去业务化显式词表 |
| `summary` | 模式说明 | 问题、边界、行为、状态和风险 |
| `sources` | 证据引用 | pattern、template、example 等相对来源 |
| `sourceFingerprint` | 防静默漂移 | 来源内容 SHA-256 |
| `demoId` | 关联 Adapter | 必须能在 Demo Registry 中解析 |

### 5.2 状态所有权

- 目录搜索、当前模式、当前页签和重置实例号：工作台页面状态；
- 当前模式 ID：同步到 URL，非法或缺失值回退到稳定首项；
- 案例输入、展开、页签和模拟对象：各 Demo Adapter 内部状态；
- 不创建数据库、本地业务缓存或跨会话案例状态；
- 不迁移任何 MCRM 数据。

## 6. 页面与交互实现策略

- 使用语义化 `header`、`nav`、`main` 和页签结构；
- 当前模式条目同时使用视觉选中和可访问状态；
- 搜索使用纯函数归一，空白查询返回完整目录；
- 模式切换同时更新 URL、模式头、原型和说明；
- 原型与说明共享一个 PatternDefinition，避免分别查找造成错配；
- 每个 Demo 使用命名空间样式根和本地令牌，避免样式外泄；
- 原型失败由 Demo Boundary 捕获，说明页签和目录继续工作；
- 窄屏将目录变成可关闭区域并恢复焦点，具体断点由实现验证确定。

## 7. API、网络与持久化

本切片没有业务 API、事件、鉴权和数据库。

唯一外部可观察地址契约是当前模式参数：

- 合法模式 ID：打开对应模式；
- 缺失或非法 ID：回退稳定首项并保持页面可用；
- 案例内部输入和操作状态不写入 URL；
- 运行时不请求生产域名或第三方内容。

如果未来引入远程案例或内容服务，必须重新打开 Architecture Gate。

## 8. 安全、性能与可观测

### 安全

- 依赖只在 Architecture Gate 批准后安装并锁定；
- 样例数据去业务化，不包含真实客户、账号、组织或地址；
- 不使用远程脚本、生产 Token、生产接口或外部写入；
- 自动测试检查声明交互不会发起非静态资源网络请求；
- 原型中的危险操作只产生模拟页面反馈。

### 性能

- 两个 Demo 使用懒加载，工作台首屏不必执行未选中案例；
- 不引入 Ant Design、图表库、状态库或路由库；
- 构建时记录产物体积，首片先建立真实基线，不虚构硬阈值；
- 若新增模式导致首屏回归，再基于基线建立预算。

### 可观测

- 开发和测试环境记录 Demo 加载失败；
- 用户界面只展示可理解错误，不暴露堆栈或本地路径；
- 首期无远程日志、遥测或用户行为采集。

## 9. 测试实现策略

| 层次 | 覆盖 | 主要证据 |
|---|---|---|
| 纯逻辑测试 | 搜索归一、排序、非法 ID 回退、来源投影校验 | Vitest |
| 页面集成测试 | 目录、选择、页签、上下文一致、重置、失败隔离 | React Testing Library + Vitest |
| Demo 行为测试 | 两个 Adapter 的声明交互和预置状态恢复 | React Testing Library + Vitest |
| 真实浏览器 | 键盘路径、窄屏、URL、网络记录、视觉状态 | `agent-browser` 验收记录 |
| 构建检查 | lint、typecheck、test、build、来源指纹 | `pnpm verify` |

所有 `TC-*` 初始保持 `not-run`；实现后才记录真实命令、结果和证据。

## 10. 质量命令与 CI

计划提供：

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

`verify` 串联来源投影检查、lint、typecheck、test 和 build。由于本项目由根仓库跟踪，CI 在根仓库工作流中调用本项目的 `pnpm verify`，不创建无效的嵌套仓库工作流。

## 11. 影响范围

| 层/模块 | 变化 | 不变化 |
|---|---|---|
| 根工作台 | 增加项目校验入口和 CI 调用 | 不改变 MCRM 与 gf_scm 独立历史 |
| 方法论资产 | 首片只读引用并计算指纹 | 不改变既有模式状态和业务结论 |
| Demo 项目 | 新建静态应用、投影、两个 Adapter 和测试 | 不增加后端、数据库和在线编辑 |
| 参考项目 | 只读分析 MCRM 交互证据 | 不修改或复制其业务模块 |

## 12. 实施顺序

以下内容已转换为 `tasks.md` 中的稳定 `TASK-*`：

1. 建立静态 Web 项目骨架与质量命令；
2. 建立 PatternDefinition、目录 Module 和来源指纹检查；
3. 先写目录、选择、上下文和重置的失败测试；
4. 实现工作台壳层与响应式/键盘行为；
5. 实现导航 Demo Adapter 及声明交互；
6. 实现记录管理 Demo Adapter 及声明交互；
7. 实现模式说明、错误隔离和重试；
8. 补齐自动化、构建、根 CI 与真实浏览器验收；
9. 完成需求一致性、代码安全和集成运行三视角评审。

## 13. 风险与 ADR

| ID | 决策/风险 | 处理 | 复审条件 |
|---|---|---|---|
| `ADR-001` | 注册表驱动工作台与 Demo Adapter seam | 采用，详见 ADR | 达到 10 个模式或出现第二种渲染方式 |
| `RISK-001` | 展示投影与方法论漂移 | 来源指纹和必填字段检查 | 误报频繁或多应用消费 |
| `RISK-002` | 原生 Demo 重实现偏离已有案例 | 复用不变量、令牌和验收；浏览器对照 | 交互差异无法解释 |
| `RISK-003` | 样式互相污染 | 命名空间根、局部令牌和测试 | 第三个 Adapter 出现冲突 |
| `RISK-004` | 平台范围膨胀 | 首片无后端、无编辑、无比较、无自动生成 | 新需求改变产品边界 |

## 14. 回滚与恢复

- 实现失败时可移除本项目应用骨架，不影响 `_methodology/` 和 MCRM；
- 单个 Demo Adapter 失败时目录与说明仍可用，并可暂时标记案例不可用；
- 来源指纹不匹配时构建失败，维护者复核后更新投影或纠正来源；
- 不存在数据库、迁移或外部写入，因此无需数据回滚。

## 15. Architecture Gate

- 结论：approved
- 批准人：当前 Codex 任务用户（姓名未提供）
- 时间：2026-08-30
- 证据：`REQSRC-004`
- 已批准：采用 ADR-001；使用 React/TypeScript/Vite 静态单包；无后端/数据库；两个原生 Demo Adapter；项目继续由根仓库跟踪。
