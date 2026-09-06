# Specification Gate 评审：数据库驱动的导航与角色授权

> 评审对象：`spec.md`、`clarification.md`、`testcases.md`、`traceability.md`
> 状态：`approved`
> Business Gate：approved（`REQSRC-018`）

## 1. 本次待批准范围

- 当前用户由认证会话确定，客户端只选择目标 `systemCode`；
- 六类逻辑数据上的多系统隔离、有效性过滤和纯角色授权链；
- APPLICATION / SYSTEM_MANAGEMENT 双区授权树和页面 `allowedActions`；
- PAGE 直接授权、GROUP 不继承、ACTION 依赖 MENU；
- 401/403/404/503、默认拒绝、零业务变更和不泄漏行为；
- 每系统系统管理角色、admin 角色成员关系和显式 grant；
- 下一请求生效、历史导航交互回归与测试设计；
- `Q-SPEC-501`—`Q-SPEC-507` 的推荐答案。

## 2. 不在本 Gate 批准的内容

本 Gate 不批准数据库品牌和字段物理类型、Prisma Schema、DDL、迁移/种子实现、密码哈希、Session 技术、API 路由、缓存实现、Nest 模块结构、前端状态库、Plan、Tasks、编码、部署、Release 或通用资产晋升。

## 3. 完整性检查

| 检查项 | 证据 | 结果 |
|---|---|---|
| Business Gate 和边界明确 | `REQSRC-018`、`requirements/original.md` | ready |
| 用户故事和成功结果明确 | `spec.md` §2 | ready |
| 多系统与角色授权规则明确 | `REQ-501`—`REQ-512`、`BR-501`—`BR-503` | ready |
| 返回字段与双区结构明确 | `REQ-505`—`REQ-507`、`BR-504` | ready |
| 失败与不泄漏行为明确 | `spec.md` §6 | ready |
| 范围排除明确 | `REQ-514/515` | ready |
| 所有 REQ/NFR/AC 可追溯 | `traceability.md` | ready |
| 正常、失败、安全和迁移测试已设计 | `testcases.md` | ready |
| 历史验证未冒充新证据 | `testcases.md` §6 | ready |
| Architecture 决策未提前固化 | 本文件 §2、`clarification.md` | ready |

## 4. 风险与规格控制

| 风险 | 规格控制 |
|---|---|
| admin 被实现为账号旁路 | 系统管理角色也必须依靠成员关系和显式 grant |
| 前端过滤被误当授权 | 页面与操作接口都由服务端重新授权 |
| 父组授权放大到子页 | PAGE 直接 MENU grant，GROUP 不继承 |
| 搜索/错误响应泄漏隐藏项 | 先授权后返回，错误不包含受限元数据 |
| 多系统关系串线 | systemCode 一致性规则与隔离反例 |
| 缓存导致撤权延迟 | 变更在下一请求生效，缓存必须确定性失效 |
| 故障时显示或放行全部 | 503 且默认拒绝，不允许回退到全量菜单 |
| 把六表扩大成完整 IAM | 明确排除管理 UI 和数据权限 |

## 5. 结论

该规格已具备 Architecture Gate 的输入条件。Rick 已批准本 Gate，并同时批准 `Q-SPEC-501`—`Q-SPEC-507` 的推荐答案。

批准后仅允许编制 Architecture 候选，确定物理数据模型、认证、API、授权执行、迁移目录、前端接入、测试与回滚方案；仍不得创建 SQL、后端代码或替换现有运行时，直至 Architecture Gate 获批。

## 6. 人工决定

- 结论：approved
- 批准人：Rick
- 时间：2026-09-03T20:02:41+08:00
- 备注：批准可观察行为、角色授权规则、错误边界、验收标准和测试设计；不包含 Architecture、Tasks、实现、部署、Release 或资产晋升。
- 批准来源：`REQSRC-019`
