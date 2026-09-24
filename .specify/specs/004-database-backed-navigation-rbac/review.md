# 切片 004 实现评审

> 评审时间：2026-09-03
> 评审对象：当前未提交工作树，相对 `interaction-pattern-lab` 的 `HEAD ae4c800`
> 结论：实现评审通过；Release Gate 已由 `REQSRC-021` 批准

## Standards 轴

初审发现稳定密钥 ID、测试凭据和执行文档一致性问题；已分别通过基于密钥摘要的 keyId + 轮换测试、数据库测试运行时环境变量、同步 testcases/traceability/evidence 关闭。请求日志只包含 requestId、方法、路由模板、systemCode、结果码和耗时，不记录密码、Cookie、请求体、菜单标签或角色数据。

保留一个 P2 判断项：`ShowcaseApp.tsx` 同时负责会话、系统切换、导航壳和页面适配。当前切片规模下可接受，但新增页面模式前应拆分，避免 Divergent Change。

## Spec 轴

初审 5 项及一次复核项均已修复：

1. 具体操作通过 `executeAuthorizedAction` 在 REPEATABLE READ 授权事务内复核并执行；提交异常触发内存 Demo 状态补偿，资源服务互斥队列防止补偿覆盖并发成功结果；
2. 页面权限 503 提供“重试页面权限”，操作失败提供可恢复反馈；
3. 前端保留服务端返回的全部 management 根节点，不再只取 `[0]`；
4. Seed 对空、重复、非法 `SYSTEM_CODES` 直接失败；
5. 性能夹具覆盖 admin 20 角色，并断言 250 节点与每页操作上限；
6. Session key 使用内容派生的稳定 ID，轮换后前一密钥仍可验签。

未发现用户直授权、admin 账号旁路、跨系统 fallback、通用 action executor 或其他范围蔓延。

## 集成运行轴

- PostgreSQL 16 空库迁移、重复 Seed、复合 FK / partial unique / effective period 反例通过；
- API 真实数据库 12 项通过，角色、成员、菜单、操作和 grant 变化均在下一请求生效；
- 数据库断连时导航和写操作均 503，恢复后可继续服务；
- 固定数据规模 P95 37.7ms，性能夹具清理后恢复基线计数；
- 浏览器确认 admin 全量授权、viewer 最小授权、搜索不泄漏、双系统失败关闭及低高度可用。

## 复用结论

可跨项目复用的候选是：六表 RBAC 不变量、目标系统过滤、双区导航投影、MENU→ACTION 依赖、服务端二次鉴权、故障默认拒绝和验收清单。不可直接复用的是演示账号密码、演示菜单内容、内存资源数据、组织身份接入及任何来源项目实现。

本次已通过 Release Gate 并登记为验证场内已发布切片；仍需至少一次真实新项目采用验证和独立晋升评审后，才可成为正式方法论模式。
