# Release Gate 评审：数据库驱动的导航与角色授权

> 评审对象：切片 004 的已批准规格、架构、实现、测试与三视角评审证据
> 提交时间：2026-09-03
> 状态：`approved`（`REQSRC-021`）

## 1. 门禁决定

Rick 已通过 `REQSRC-021` 批准切片 004 作为 Interaction Pattern Lab 内“已实现、已验证”的可发布验证切片。这里的 Release 仅表示该切片可以在验证场中按既有运行说明使用和继续积累采用证据，不表示已经部署到任何环境，也不批准生产使用或方法论资产晋升。

Rick 当前承担本项目的产品、测试、技术和发布 Gate 决策职责，并接受以下证据、遗留风险、发布边界与回滚条件。

## 2. 上游 Gate 与交付范围

| 项目 | 结论 | 证据 |
|---|---|---|
| Business Gate | approved | `REQSRC-018`、`requirements/original.md` |
| Specification Gate | approved | `REQSRC-019`、`specification-gate-review.md` |
| Architecture Gate | approved | `REQSRC-020`、`architecture-gate-review.md`、`ADR-004` |
| Tasks 与实现 | completed | `TASK-501`—`TASK-509`、`implementation-evidence.md` |
| 三视角评审 | P0/P1 已关闭 | `review.md` |
| Release Gate | approved | `REQSRC-021` |

本次交付包括：六类 RBAC 逻辑数据与数据库约束、幂等迁移/Seed、admin/viewer 角色链、会话认证、多系统双区菜单、页面与操作服务端授权、授权失败行为、前端接入、日志与健康检查，以及自动化、数据库、性能和浏览器证据。

本次不包括：数据权限、DENY、用户直授权、系统/Session 第七张表、完整 IAM 管理 UI、生产身份提供方、真实业务数据、生产部署和通用模式晋升。

## 3. Release 证据

| 门禁维度 | 结果 | 可复核证据 |
|---|---|---|
| 需求一致性与追溯 | passed | `REQ-501`—`REQ-516`、`NFR-501`—`NFR-506`、`AC-501`—`AC-508` 均映射到测试与任务；见 `traceability.md` |
| 功能与异常行为 | passed | Contracts 4、Server 单元 13、Web 59；401/403/404/503、重试与零变更拒绝均覆盖 |
| 数据与迁移 | passed | PostgreSQL 16 空库迁移、重复 Seed、六表约束和 12 项数据库/API 集成测试通过 |
| 安全与权限 | passed | 角色唯一授权链、无 admin 旁路、ACTION 依赖 MENU、Origin/CSRF、签名 Cookie 与密钥轮换均已验证 |
| 故障与恢复 | passed | 数据库断连时导航和写操作均返回 503；恢复数据库后可继续服务，不回退为全量权限 |
| 性能 | passed | 2 个系统 × 250 菜单、每页不超过 8 个操作、admin 20 个角色；100 次预热 + 100 次采样，P95 37.7ms，预算为 300ms |
| 浏览器与可访问交互 | passed | admin/viewer、双系统、三种桌面视口、搜索、折叠、键盘、操作与失败关闭通过；见 `evidence/` |
| 工程质量 | passed | `pnpm verify`、切片 `check-sdd.sh ... full` 和根 `verify-all.sh` 均实际通过 |
| 可观测与运营准备 | passed-for-lab | 请求日志不含凭据和权限详情；live/ready 健康检查覆盖数据库与迁移；本地启动步骤已登记 |
| 部署 | not-performed | 本 Gate 不把本地验证冒充部署证据 |

详细命令、数据规模、截图和缺陷闭环见 `implementation-evidence.md` 与 `testcases.md`。

## 4. 遗留风险与接受条件

| ID | 级别 | 风险 | 负责人 | 期限/触发条件 | Gate 建议 |
|---|---|---|---|---|---|
| `REL-RISK-501` | P2 | `ShowcaseApp.tsx` 同时承担会话、系统切换、导航壳和页面适配，继续扩展会增加变更耦合 | 技术负责人（当前 Rick） | 新增下一个页面模式前，拆分会话状态机、导航壳和页面适配器 | 接受，不阻断本切片 |
| `REL-RISK-502` | 边界 | 本地短期签名 Cookie 不支持逐会话服务端撤销，也不是生产身份方案 | 后续采用项目技术负责人 | 任一真实项目采用或接入生产身份前重新设计并过 Architecture Gate | 接受，仅限验证场 |
| `REL-RISK-503` | 边界 | 37.7ms 只证明固定本地数据集，不是生产容量承诺 | 后续采用项目技术负责人 | 真实项目按数据量、拓扑和 SLO 重做性能基线 | 接受，仅限验证场 |

不存在未关闭的 P0/P1。若批准，以上边界和 P2 必须随切片证据保留，不得在后续引用时省略。

## 5. 发布、恢复与回滚条件

### 批准后的允许动作

- 将切片 004 状态登记为 `release-gate-approved` / `released-in-validation-lab`；
- 按 README 在本地或明确授权的验证环境启动，供交互评审和项目采用验证；
- 把本次结果登记为候选实践的一次实现与交互验证证据；
- 在后续真实项目中重新走该项目自己的 Business、Specification、Architecture 与 Release Gate。

### 仍然禁止

- 未经单独授权部署到外部、共享或生产环境；
- 把测试账号、密码、演示菜单或内存业务数据当作生产资产；
- 将本切片直接宣布为通用最佳实践或正式 `_methodology/patterns/`；
- 省略真实项目的身份、安全、数据迁移、容量和运维评审。

### 停止/回滚条件

遇到以下任一情况，应停止发布登记或将切片退回 `verified`/`implementing`：

1. P0/P1 验收回归、角色隔离失效、admin 出现账号旁路或未授权操作产生业务变更；
2. migration/Seed 无法在空库复现，或数据库故障不再默认拒绝；
3. 文档、迁移、Seed 和运行代码对六表不变量或系统代码的定义不一致；
4. 发布边界被扩大为生产 IAM、数据权限或真实业务写入。

验证场回滚采用代码与迁移版本回退/前滚修复方案；数据库回滚前必须备份专用验证数据。已在共享环境产生数据时不执行破坏性自动回滚，改用新迁移前滚修复。详细方案见 `plan.md` §11 和 `ADR-004`。

## 6. 总结与回流判断

本次已确认：数据库驱动的多系统双区导航、纯角色 MENU/ACTION 授权、服务端二次鉴权、下一请求生效和故障默认拒绝在批准的数据规模与验证环境中成立。

仍未确认：真实组织身份接入、逐会话撤销、生产容量、数据权限、管理 UI，以及第二个真实项目的采用效果。

可跨项目复用的候选是六表业务不变量、双区投影规则、MENU→ACTION 依赖、失败关闭语义、测试清单和接入决策点。不可直接复用的是演示凭据、演示菜单内容、内存资源数据、来源项目代码和组织专属身份方案。

即使 Release Gate 获批，本次也只新增“验证场已发布”证据；正式方法论晋升仍需独立评审和真实项目采用证据。

## 7. 人工决定

- 结论：approved
- 批准人：Rick
- 时间：2026-09-03T23:49:25+08:00
- 批准来源：`REQSRC-021`
- 备注：批准切片登记为 `released-in-validation-lab`，接受 `REL-RISK-501`—`REL-RISK-503`；不包含外部/生产部署、生产 IAM、数据权限、真实业务写入或方法论正式模式晋升。
