# REQSRC-017 增量转换、参考证据与冲突分析

## 1. 来源和证据

| 来源 | 性质 | 本次作用 |
|---|---|---|
| `REQSRC-017/source.md` | 用户新需求原文 | 要求真实前后端/数据库菜单与纯角色授权 |
| `_ref/gf_scm/docs/scripts/create-local-iam-tables.sql` | 只读参考实现 | 证明参考系统已存在 system、page、button、role、binding、grant 等数据库结构 |
| `_ref/gf_scm/packages/scs-server/src/iam/postgres-iam.store.ts` | 只读运行实现 | 证明其按 system 查询页面、按角色授权裁剪导航、保留祖先并解析按钮权限 |
| `_ref/gf_scm/packages/scs-server/src/iam/iam.controller.ts` | 只读 API 实现 | 证明其提供当前用户 nav、permissions、role grants、page/buttons 等接口 |
| `_ref/gf_scm/packages/scs-server/scripts/seed-menu.ts` | 遗留/来源专属脚本 | 只用于理解历史菜单层级；包含远端平台、固定租户/应用和业务菜单，不复用 |

读取时未修改 `_ref/gf_scm/`。

## 2. 明确事实、实现推断与未知

### 材料明确事实

- `iam_page_resource` 使用 `system_code`、父级、类型、路由、图标、排序和启停字段；
- `iam_page_button` 将页面操作绑定到页面；
- `iam_role`、`iam_role_binding`、`iam_permission_grant` 建立角色、主体绑定和 PAGE/BUTTON/ACTION 授权；
- PostgreSQL Store 先按当前 `tenantId + systemCode` 读取页面，再按角色 grant 计算可见页面，导航命中叶子时保留祖先；
- 当前用户导航接口为 `GET /iam/me/nav`，主体来自已认证请求上下文。

### 由实现支持的推断

- “菜单目录”和“角色授权”分离可避免为每角色复制菜单树；
- 页面访问与按钮操作使用同一权限快照，可降低前后端判断漂移；
- 稳定 `system_code + menu_code/action_code` 比数据库 ID 更适合种子、迁移和前端契约。

### 当前未知

- 新版 Lab 是否正式采用 `typescript-enterprise-web` Profile；
- 系统是否需要独立 `iam_system` 第七张目录表，还是由外部系统登记册约束 `system_code`；
- 本轮认证是本地密码、开发身份提供器，还是接入既有 SSO；
- 系统管理角色对未来新增菜单/操作是自动全覆盖，还是由迁移显式补 grant。

## 3. 保留与排除

| 结论 | 内容 | 原因 |
|---|---|---|
| 保留为不变量 | 按系统隔离；菜单/操作目录与角色授权分离；叶子授权保留祖先；服务端再次鉴权；默认拒绝 | 与用户目标一致且可跨项目验证 |
| 简化后采用 | PAGE/BUTTON/ACTION 统一 grant 模型简化为 MENU/ACTION；USER 绑定简化为角色用户关系 | 本次明确不含组织/群组/数据权限 |
| 排除 | tenant、组织、群组、角色继承、ABAC、字段权限、数据范围、外部资源目录、历史兼容 ID | 超出本轮范围且属于来源环境约束 |
| 排除 | 用户级 `is_super_admin` 或 `*` 旁路 | 与“权限全部通过角色授权”直接冲突 |
| 排除 | 远端菜单 API、固定租户/应用 ID、来源品牌和业务菜单 | 来源专属且存在安全/复用风险 |

## 4. 与已批准基线的冲突

| 已批准项 | REQSRC-017 新要求 | 处理 |
|---|---|---|
| `REQ-321`：仅前端演示，不连接账号数据库 | 真实用户、角色、菜单和权限表 | `REQ-321` 对新版目标废止，重新打开 Business Gate |
| 003 Spec `REQ-411`：Checked JSON Registry 为单一事实源 | 数据库和后端成为运行时菜单/权限事实源 | 旧 Registry 降为历史 fixture/种子候选，需新版 Spec |
| ADR-003：无网络、无存储、无后端 | 前后端与 PostgreSQL 闭环 | ADR-003 仅保留历史决策，需新 ADR/Architecture Gate |
| Constitution：Demo 操作不写真实业务数据 | 权限配置需要本地数据库持久化 | 区分“演示业务数据”与“系统配置数据”；需 Business Gate 明确 |
| 当前单包 React/Vite | 需要 API、迁移和数据库 | 技术 Profile 与目录改造待 Architecture Gate |

## 5. Gate 影响

- 目标、范围、角色和系统边界变化：重新打开 Business Gate；
- 菜单、操作、授权和失败行为变化：旧 Specification Gate 不覆盖；
- 数据模型、认证、API、迁移与技术栈变化：旧 Architecture Gate 不覆盖；
- 已完成的前端交互代码和浏览器证据保留，但 TASK-407/Release 评审停止；
- 未经新 Gate 批准，不创建 DDL、不执行迁移、不接入参考项目数据库。
