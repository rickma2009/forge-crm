# Skills 初始化与使用规范

> 版本：v1.1
> 更新：2026-08-30

## 1. 目标

Skills 用于把稳定、可重复的 AI 工作方式变成可发现、可验证的执行能力。它不替代 `AGENTS.md`、业务需求、项目宪法或人工 Gate。

本工作台采用三级管理：

| 层级 | 放置位置 | 用途 |
|---|---|---|
| 方法论源 | `_methodology/skills/` | 唯一规范源、测试场景和初始化清单 |
| 工作台入口 | `.agents/skills/`、`.claude/skills/` | 指向方法论源的适配链接，供不同 AI 工具发现 |
| 项目专属 | `<project>/.agents/skills/` | 仅存放确有项目特性的可复用能力，默认不创建 |

因此，`mcrm` 没有本地 Skills 并不表示 SDD 未启用；此前使用的是用户级 Skill。现在工作台会显式初始化自身的 `sdd-forge-workflow`，项目无需复制。

## 2. 必需初始化

克隆或首次使用工作台后运行：

```bash
node _methodology/scripts/init-skills.mjs
node _methodology/scripts/init-skills.mjs --check
```

初始化脚本按 `_methodology/skills/manifest.json` 创建适配链接。若目标已有普通目录或指向其他来源，脚本会停止，不覆盖用户资产。

必需 Skill 当前只有：

- `sdd-forge-workflow`：负责阶段识别、Gate、追溯、纵向切片、参考萃取和总结回流。

## 3. 按阶段调用其他 Skills

其他 Skills 不应全部复制进仓库。先检查当前 AI 环境是否已提供；只有任务进入对应阶段且确有需要时才调用。若缺失，再由用户授权安装或在方法论中创建替代能力。

| 阶段 | 条件 Skill | 何时需要 | 初始化策略 |
|---|---|---|---|
| 项目章程、业务蓝图 | `product-expert` | 跨模块能力蓝图、总体规划或系统边界复杂 | 检查可用性，按需启用 |
| 需求归档与转换 | `requirement-analysis-pro` | 多来源、旧新冲突、详细业务规则或验收口径复杂 | 检查可用性，按需启用 |
| 材料读取 | `documents` / `pdf` / `spreadsheets` | 输入是对应格式且需要结构化读取 | 检查可用性，按文件类型启用 |
| Spec、Plan、Tasks、实现与评审 | `sdd-forge-workflow` | 所有工作台项目 | 工作台必需初始化 |
| Web 验收 | `agent-browser` | 需要真实页面交互和端到端证据 | 实现后、验收前按需启用 |
| 流程或架构表达 | `professional-diagram` | 三个以上分支、状态或依赖难以用短文说明 | 按需启用 |
| 方法论能力沉淀 | `skill-creator` | 新建、修改或评估 Skill | 仅方法论变更时启用 |

Matt Pocock 工程 Skills 采用“SDD 治理、Matt 执行”的边界：`wayfinder`、`grilling`、`research`、`prototype` 可辅助探索，`tdd`、`codebase-design`、`code-review` 可辅助实现；`to-spec`、`to-tickets` 与 tracker 状态必须按 [`10-SDD与Matt工程流程集成规范.md`](10-SDD与Matt工程流程集成规范.md) 适配，不能创建第二规格源或越过人工 Gate。

`setup-matt-pocock-skills` 是每个 Git 仓库的一次性协作配置，不是 SDD 初始化：根工作台和独立的 MCRM 分别配置；`_methodology/` 与当前仍由根仓库跟踪的 `interaction-pattern-lab/` 不单独配置。

具体清单由 `_methodology/skills/manifest.json` 管理。新增“必需”Skill 时必须同时提供 `SKILL.md`、至少两个测试场景、初始化目标，并更新本规范、模板、金标准说明和自动检查。

## 4. 是否创建项目专属 Skill

只有同时满足以下条件才在项目中创建：

1. 能力包含该项目独有的领域规则、系统接口或固定操作流程；
2. 会被多次复用，单靠 `AGENTS.md` 路由不够；
3. 有明确输入、输出、失败边界和测试场景；
4. 不会把密钥、个人信息或环境地址固化进去。

通用 SDD 流程、权限原则、密码安全清单等应留在方法论层，不在 `mcrm` 重复维护。

## 5. 安装与安全边界

- “检查可用性”不等于自动联网安装；缺失的外部 Skill 需要用户授权后安装。
- 外部 Skill 只提供执行方法，不能覆盖本仓库的 `AGENTS.md`、项目 Spec 或 Gate 决策。
- 不把 `_ref/gf_scm` 的代码包装成 Skill；先按参考萃取规则去业务化并经真实切片验证。
- Skill 可指导检查和产出，但不得把未执行测试、未批准 Gate 或未发布状态写成事实。

## 6. 验证与维护

工作台全量验证会检查 Skill 源、测试场景和适配链接：

```bash
bash _methodology/scripts/verify-workbench.sh
```

Skill 的测试场景位于其 `evals/evals.json`。本次先建立可检查的场景基线；当 Skill 行为发生实质变化时，再进行带 Skill/不带 Skill 的对比评估与人工复核。
