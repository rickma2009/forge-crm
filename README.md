# sdd-forge

> 面向 AI 协作的 SDD（Specification-Driven Development）方法论工作台。
>
> 目标不是复制某个历史项目，而是把业务目标稳定地转化为可追溯、可验证、可运营的数字化系统。

## 1. 仓库定位

`sdd-forge` 包含三类资产，三者职责严格分离：

| 区域 | 定位 | 是否是规范源 |
|---|---|---|
| `_methodology/` | 方法论、模板、门禁和金标准案例 | **是，唯一规范源** |
| `_ref/` | 在建项目、历史代码和经验素材 | 否，只读参考 |
| `<project-name>/` | 使用方法论建设的独立项目 | 只对本项目负责 |

### 关于 `gf_scm`

`_ref/gf_scm/` 是一个仍在建设和演进中的实际案例，不是最佳实践，也不是可直接复制的脚手架。它可能包含历史 Java 技术栈、旧目录、特定企业平台约束、过时模板和未完成设计。

使用它时必须遵守：

1. 只把它当作问题案例、实现素材和经验来源。
2. 不直接复制其 `.specify/`、`AGENTS.md`、业务模块或技术约束。
3. 任何复用内容都必须先与 `_methodology/` 的当前规范核对。
4. 发现可复用经验时，先抽象、去业务化、验证，再沉淀到 `_methodology/`。

## 2. 单一事实源

- SDD 目录统一使用 `.specify/`，不再使用 `_spec/`。
- 通用方法论只维护在 `_methodology/`。
- 项目约束维护在项目自己的 `AGENTS.md` 和 `.specify/memory/constitution.md`。
- 业务需求、验收标准、测试、计划和任务通过稳定 ID 追溯。
- 阶段完成以可验证证据为准，不以 AI 自述或手工勾选为准。

## 3. 标准工作流

```text
项目章程 → 业务发现 → 系统边界 → 架构与骨架 → AI/SDD 初始化
       → Spec → Testcases → Plan → Tasks → Implement
       → Review → Release → 运营反馈与方法论回流
```

四个人工决策门：

| Gate | 人类确认内容 | AI 可以做什么 |
|---|---|---|
| Business Gate | 目标、范围、角色、成功指标 | 分析、归纳、提出澄清问题 |
| Spec Gate | 业务语义、验收标准、优先级 | 生成规格和测试场景 |
| Architecture Gate | 系统边界、数据、安全、重大 ADR | 提供方案、评估风险 |
| Release Gate | 验收证据、上线、回滚 | 汇总证据、执行获授权的动作 |

## 4. 目录结构

```text
sdd-forge/
├── README.md
├── _methodology/
│   ├── 00-搭建指南.md
│   ├── 01-技术规范清单.md
│   ├── 02-参考资产复用指南.md
│   ├── 03-SDD规范与质量门禁.md
│   ├── 04-需求追溯规范.md
│   ├── 05-v0.2整改闭环.md
│   ├── 06-原始需求与转换管理规范.md
│   ├── 07-Skills初始化与使用规范.md
│   ├── 08-企业管理系统交互模式分类方法.md
│   ├── skills/                    # 工作台级 Skills、清单与测试场景
│   ├── templates/                 # 技术栈中立模板
│   ├── examples/                  # 金标准切片
│   ├── reference-cases/           # 有证据但尚待真实切片验证的 R1 萃取案例
│   ├── patterns/                  # 经验证的可复用模式
│   ├── decisions/                 # 工作台级 ADR
│   └── scripts/                   # 自动校验工具
├── _ref/
│   └── gf_scm/                    # 在建案例，只读参考
├── interaction-pattern-lab/       # 企业管理系统交互模式 Demo 项目
└── <project-name>/
    ├── AGENTS.md
    ├── CLAUDE.md -> AGENTS.md
    ├── .specify/
    │   ├── memory/
    │   └── specs/
    ├── _build-log/
    ├── docs/
    └── packages/
```

## 5. 使用顺序

1. 阅读 [`00-搭建指南.md`](_methodology/00-搭建指南.md)。
2. 运行 `node _methodology/scripts/init-skills.mjs`，并阅读 [`07-Skills初始化与使用规范.md`](_methodology/07-Skills初始化与使用规范.md)。
3. 使用 [`templates/`](_methodology/templates/) 建立项目章程、宪法和功能规格；进入企业系统页面规划时，先按 [`08-企业管理系统交互模式分类方法.md`](_methodology/08-企业管理系统交互模式分类方法.md) 识别页面、操作、展示、状态与特殊操作。
4. 参考 CRUD 类 [`000-golden-slice-customer-lead`](_methodology/examples/000-golden-slice-customer-lead/)、工作流类 [`001-golden-slice-lead-review-workflow`](_methodology/examples/001-golden-slice-lead-review-workflow/)、导航交互类 [`002-golden-interaction-enterprise-navigation-shell`](_methodology/examples/002-golden-interaction-enterprise-navigation-shell/) 和记录管理交互类 [`003-golden-interaction-record-management-workspace`](_methodology/examples/003-golden-interaction-record-management-workspace/)。
5. Spec 阶段运行 `bash _methodology/scripts/check-sdd.sh <功能目录> spec`，完整交付运行 `... full`。
6. 通过对应人工 Gate 后才进入下一阶段。

项目骨架还应运行：

```bash
bash _methodology/scripts/check-project.sh <项目目录>
```

工作台全量验证：

```bash
bash _methodology/scripts/verify-workbench.sh
```

## 6. 项目索引

| 项目 | 状态 | 说明 |
|---|---|---|
| `mcrm` | 002/003 已验证、待 Release Gate | 首业务切片可构建运行；003 企业双层导航已完成组件、构建和浏览器验收；生产限速、恢复演练及 Release Gate 仍是发布前置项 |
| `interaction-pattern-lab` | Release Gate approved、本机生产预览可用 | 企业管理系统交互模式 Demo 工作台；首片验证通过，外部私有托管等待可用连接器 |

## 7. 方法论版本

当前版本：**v0.2**（2026-08-29）

本版本完成：

- 将 `_methodology/` 确立为唯一规范源；
- 将 `gf_scm` 降级为在建参考案例；
- 统一 `.specify/` 目录；
- 引入项目发现、人类决策门、需求追溯和自动质量门禁；
- 建立技术栈中立模板与独立金标准切片。
- 建立工作台级 Skills 清单、初始化入口、阶段路由和自动检查。
- 建立“参考源码萃取 → 真实项目验证 → UI 模式/模板/交互案例”的交互资产回流路径。
