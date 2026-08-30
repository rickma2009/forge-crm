# sdd-forge

> 面向企业应用 AI 工程的治理、创建、验证与资产复用工作台。
>
> 目标不是复制某个历史项目，而是把业务目标稳定地转化为可追溯、可验证、可运营的数字化系统。

## 1. 仓库定位

`sdd-forge` 这个名称继续保留：SDD 是治理骨架，但工作台并不限于一种开发技法。Matt Pocock 工程 Skills 等外部方法作为探索和执行工具接入，不能替代 SDD 的事实源、Gate 与追溯。

仓库包含以下边界，职责严格分离：

| 区域 | 定位 | 是否是规范源 |
|---|---|---|
| `_methodology/` | 方法论、模板、门禁和金标准案例 | **是，唯一规范源** |
| `_ref/` | 在建项目、历史代码和经验素材 | 否，只读参考 |
| `interaction-pattern-lab/` | 企业交互模式验证场 | 否，只提供验证证据 |
| `mcrm/` | 独立 Git 仓库中的真实实践项目 | 只对 MCRM 负责 |
| `<project-name>/` | 未来由工作台创建的独立项目 | 只对本项目负责 |

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
治理初始化 → 项目章程 → 业务发现 → Business Gate → 系统边界与架构
       → Architecture Gate → 应用技术 Profile → Spec → Testcases → Plan → Tasks → Implement
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
│   ├── 09-资产类型、成熟度与晋升规范.md
│   ├── 10-SDD与Matt工程流程集成规范.md
│   ├── project-init/              # 技术栈中立的项目初始化清单
│   ├── profiles/                  # Architecture Gate 后显式应用的技术 Profile
│   ├── skills/                    # 工作台级 Skills、清单与测试场景
│   ├── templates/                 # 技术栈中立模板
│   ├── examples/                  # 金标准切片
│   ├── reference-cases/           # 有证据但尚待真实切片验证的 R1 萃取案例
│   ├── patterns/                  # 经验证的可复用模式
│   ├── decisions/                 # 工作台级 ADR
│   └── scripts/                   # 自动校验工具
├── _ref/
│   └── gf_scm/                    # 在建案例，只读参考
├── interaction-pattern-lab/       # 企业交互模式验证场（根仓库跟踪）
├── mcrm/                          # 独立 Git 实践项目（根仓库不跟踪）
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
3. 使用治理初始化器建立项目最小事实源；Business/Architecture Gate 后再显式应用技术 Profile。进入企业系统页面规划时，先按 [`08-企业管理系统交互模式分类方法.md`](_methodology/08-企业管理系统交互模式分类方法.md) 识别页面、操作、展示、状态与特殊操作。
4. 参考 CRUD 类 [`000-golden-slice-customer-lead`](_methodology/examples/000-golden-slice-customer-lead/)、工作流类 [`001-golden-slice-lead-review-workflow`](_methodology/examples/001-golden-slice-lead-review-workflow/)、导航交互类 [`002-golden-interaction-enterprise-navigation-shell`](_methodology/examples/002-golden-interaction-enterprise-navigation-shell/) 和记录管理交互类 [`003-golden-interaction-record-management-workspace`](_methodology/examples/003-golden-interaction-record-management-workspace/)。
5. Spec 阶段运行 `bash _methodology/scripts/check-sdd.sh <功能目录> spec`，完整交付运行 `... full`。
6. 通过对应人工 Gate 后才进入下一阶段。

项目骨架还应运行：

```bash
node _methodology/scripts/forge.mjs init ./new-project --name "New Project"
# 记录来源支持的 Business 与 Architecture Gate 后：
node _methodology/scripts/forge.mjs apply-profile ./new-project typescript-enterprise-web
cd ./new-project && pnpm install --frozen-lockfile && pnpm verify
bash _methodology/scripts/check-project.sh <项目目录>
node _methodology/scripts/check-matt-setup.mjs <项目目录>
node _methodology/scripts/check-project-profile.mjs <项目目录>
```

方法论核心验证与跨项目验证已拆分：

```bash
bash _methodology/scripts/verify-workbench.sh
bash _methodology/scripts/verify-validation-projects.sh
# 或同时执行
bash _methodology/scripts/verify-all.sh
```

## 6. 项目索引

| 项目 | 状态 | 说明 |
|---|---|---|
| `mcrm` | 002 implementation-verified、Release pending；003/004 Spec 待重确认 | 独立实践项目；尚无生产发布、业务指标改善和 Release Gate 证据 |
| `interaction-pattern-lab` | Business / Specification / Architecture approved；切片 002 review-complete-awaiting-release-gate | 企业交互模式验证场；103 项目录和 VAL-002 已本地验证，资产晋升、部署和 Release 仍未批准 |

## 7. 资产模型

工作台管理五类资产：方法规则、项目起步包、交互模式、通用能力包、参考案例。成熟度统一使用：

```text
idea → candidate → implementation-verified → interaction-verified
     → project-adopted → business-validated → released → deprecated
```

具体证据和晋升规则见 [`09-资产类型、成熟度与晋升规范.md`](_methodology/09-资产类型、成熟度与晋升规范.md)，SDD 与 Matt 的职责映射见 [`10-SDD与Matt工程流程集成规范.md`](_methodology/10-SDD与Matt工程流程集成规范.md)。

## 8. 方法论版本

当前版本：**v0.3-draft**（2026-08-31）

本版本完成：

- 将 `_methodology/` 确立为唯一规范源；
- 将 `gf_scm` 降级为在建参考案例；
- 统一 `.specify/` 目录；
- 引入项目发现、人类决策门、需求追溯和自动质量门禁；
- 建立技术栈中立模板与独立金标准切片。
- 建立工作台级 Skills 清单、初始化入口、阶段路由和自动检查。
- 建立“参考源码萃取 → 真实项目验证 → UI 模式/模板/交互案例”的交互资产回流路径。
- 完成 SDD 适配的 Matt per-repo Setup、默认 triage 词汇及自动检查。
- 建立两阶段 `forge init` / `apply-profile`，并验证 `typescript-enterprise-web` v0.2 可安装、测试和构建。
