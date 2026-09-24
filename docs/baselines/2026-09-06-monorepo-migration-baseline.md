# Interaction Pattern Lab Monorepo 迁移基线

> 基线日期：2026-09-06
>
> 状态：`verified-stable-baseline`
>
> 基线标签：`interaction-pattern-lab-baseline-20260906`

## 1. 基线结论

原 React/Vite 单包已经整理为 pnpm workspace + Turborepo，包含共享契约、NestJS 服务端、React Web 和共享 TypeScript 配置。切片 004—010 的现有代码、来源、Gate、验证证据和候选方法论资产均已进入 Git；工作区不再依赖未跟踪源码。

这仍是验证场内基线，不是外部部署、生产发布、真实项目采用或方法论资产晋升。

## 2. 可追溯提交组

| 提交 | 职责 | 可独立回退性 |
|---|---|---|
| `77430dd` | 忽略构建产物、本地环境、MCRM 与两个只读参考目录 | 可独立 revert；不要因此把参考库加入根仓库 |
| `5914a91` | 归档 REQSRC-013—031、需求包 003—006、切片 003—009 的 Gate 与 SDD 链 | 可独立审阅；若回退实现，通常一并回退此提交 |
| `8e04c52` | 单包迁移为 monorepo，并纳入数据库导航、工作区、字典、列表视图、客户目录与排版实现 | 是运行基线核心；依赖它的切片 010 代码不能单独保留 |
| `6b2681d` | 多来源 UI 萃取候选及产品设计核对证据 | 可独立 revert，不改变运行代码 |
| `2027d60` | 企业工作台候选、独立案例、自动检查和响应式浏览器证据 | 可独立 revert；同时移除 `verify-workbench.sh` 中对应检查 |

切片 010 的提交发生在迁移工作树尚未统一入库期间，因此 `8e04c52` 是这些既有提交的工程依赖。为避免改写已存在历史，本次采用追加式基线提交，不执行 rebase 或强制重写。

## 3. 安全回退方式

### 查看迁移前状态

迁移扩展前最后一个完整版本点为 `ae4c8000a05726670bb6ddecbf2c2b485b88c23f`。需要核对旧单包时，在新分支查看，不修改当前分支：

```bash
git switch -c codex/inspect-pre-lab-expansion ae4c8000a05726670bb6ddecbf2c2b485b88c23f
```

### 返回本稳定基线

```bash
git switch -c codex/restore-lab-baseline interaction-pattern-lab-baseline-20260906
```

若要撤销某一候选证据包，优先在新分支对上表提交执行 `git revert`。不要单独 revert `8e04c52` 后继续保留切片 010；应从迁移前版本点建立恢复分支，或把依赖提交按逆序整体回退。

## 4. 最终验证证据

2026-09-06 在工作台根目录真实执行：

```bash
bash _methodology/scripts/verify-all.sh
```

结果：PASS。

- 方法论 Skills、初始化器、模板、金标准案例、103 项登记册和 Markdown 本地链接通过；
- MCRM 治理与来源检查通过，项目仍为暂停状态；其历史验证结果不构成恢复开发；
- Lab 来源 35/35 哈希一致；
- Lab 合同测试 4/4；Web 28 个文件、172/172；Server 7 个 suite、13 个测试通过；
- Server 另有 2 个 suite、14 个数据库集成测试按现有环境条件跳过；
- lint、typecheck 和生产构建通过；
- Web 构建仍有主 chunk 大于 500 kB 的已知警告，未在本迁移基线中扩大为性能完成声明。

另外逐项执行完整 SDD 检查：切片 004—010 均通过。切片 003 因 `REQSRC-017` 后 Gate 被重新打开，预期不满足当前 full-stage 推进条件；其历史证据已保留，后继目标由切片 004 承接。

## 5. 纳入与排除

### 已纳入

- `packages/contracts`、`packages/server`、`packages/web`、`packages/tsconfig`；
- Prisma Schema、三次迁移、种子和验证场服务端；
- 28 个 Showcase 页面登记、企业工作台、销售订单、BOM 与历史 Demo；
- REQSRC、requirements、切片 003—010 文档和浏览器证据；
- 多来源 UI 萃取与企业工作台候选资产。

### 明确排除

- `mcrm/`：独立 Git 仓库且已暂停；
- `_ref/gf_scm/`、`_ref/gscrm-sdd/`：只读参考，不进入根仓库；
- `.env`、数据库口令、Session 密钥；
- `node_modules/`、`dist/`、`.turbo/`、Prisma 生成代码和 TypeScript 构建缓存；
- 外部部署、生产数据、资产晋升与业务验证主张。

## 6. 当前 Gate 与下一步

- 切片 002：`review-complete-awaiting-release-gate`；不能被后续批准覆盖；
- 切片 003：历史前端证据保留，相关 Gate reopened；
- 切片 004—010：仅在验证场内发布；
- `EPM-PAGE-013` 等候选资产保持其现有成熟度，不因本基线自动晋升；
- 新切片必须从新来源、业务规则和适用 Gate 开始，不得把“仓库已稳定”解释为新需求已批准。
