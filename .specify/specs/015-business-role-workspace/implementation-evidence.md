# 切片 015 实施证据（持续更新）

状态：实施中，未批准 Release。以下是已执行的局部证据，不代表 22 项 AC 全部通过。

## 已执行

- 最新连续实施增量：前端全量 Vitest 38 suites / 185 tests passed；后端单元 Jest 15 suites / 35 tests passed（23 项需显式数据库开关的测试跳过，不算通过）。
- 最新隔离数据库定向回归：`role-api.integration.spec.ts data-policy.spec.ts subject-membership.spec.ts` 3 suites / 15 tests passed（8 个真实接口旅程、5 个策略函数场景、2 个组织层级场景）。新增证据包括群组绑定取得权限、离组下一请求拒绝、重新加入再生效、群组停用再撤权、旧版本更新拒绝、隐藏字段筛选/脱敏字段排序 403、带数据策略角色的两个重新启用入口均执行委派上限。
- 组织/群组界面已接真实来源、绑定、成员增减与群组创建/启停接口；直接用户角色不被动态绑定物化。仍缺组织完整 HTTP 验收、批量来源选择和完整视觉 QA，不把局部闭环标成全任务完成。
- 前后端 noEmit 类型检查通过。切片 `check-sdd.sh .specify/specs/015-business-role-workspace` full 检查通过；这只验证文档结构/状态及 ID 覆盖，不代表功能或 Release 通过。
- 根 `verify-all.sh` 在原有领域布局检查处失败：根 CONTEXT.md 与 CONTEXT-MAP.md 同时存在。未删除或修改用户的领域文档，未把后续未执行检查记为通过。

- 角色公开契约、树不变量、视图分配契约：Jest 3 suites / 6 tests passed。
- 主从角色工作区和视图保存：Vitest 3 tests passed；数据策略编辑模板与发布：Vitest 1 test passed。
- 真实数据库接口：`RUN_ROLE_DB_TESTS=1 pnpm --filter @interaction-pattern-lab/server exec jest --runInBand role-api.integration.spec.ts data-policy.spec.ts`，2 suites / 10 tests passed。接口场景包括只读写拒绝、超管属性注入拒绝、有效期、防环、跨应用移动拒绝、版本冲突、引用保护、批量原子性、停用下一请求撤权、视图分配及撤销、归档历史、客户范围过滤、字段原值不返回、默认拒绝、策略并发冲突及回滚生成 v3 并保留 v1/v2。
- 后端与前端 noEmit 类型检查通过（增量后仍需持续重跑）。
- 本地 `http://localhost:3000/api/health/ready` 返回 `status=ok, database=ready, migrations=ready`。未重启或重复占用端口。

## 备份与迁移

- 角色安全增量：`20260922180000_role_workspace_safety`，仅新增归档列和角色树/有效期约束，已应用。
- 策略存储增量：`20260922200000_role_data_policy`，新增 6 张 sys_ 表，已应用；不自动登记或启用演示库的数据资源，不改变既有授权。
- 迁移前文件：`/private/tmp/sdd-role-015-before-20260922-8c72.dump`、`/private/tmp/sdd-role-policy-before-20260922-8c72.dump`。
- 动态来源增量 `20260922210000_role_dynamic_subjects` 已应用，新建 org_user_assignment、sys_user_group、sys_user_group_member、sys_role_subject_binding；迁移前第三份备份 `/private/tmp/sdd-role-subject-before-20260922-8c72.dump` 已验证可读取目录。新增关系未自动填充运行库。
- 第一份备份已实际恢复至 `sdd_role_015_20260922_8c72`，随后所有角色/策略写测试仅使用此隔离库；测试夹具保留在隔离库便于复核。未覆盖运行库，未修改 supply。

## 本次发现并修正的反例

不能只凭纯函数测试推断 ORM 的空条件行为。原默认拒绝表达式 `{ OR: [] }` 嵌入客户查询 AND 后，在真实 Prisma/PostgreSQL 测试中返回了全部 5 条记录。已改成明确空主键集合 `{ id: { in: [] } }`，真实接口验证清空规则后 total=0；回滚后仅恢复允许的 1 条记录。

该问题仅在隔离测试库显现；演示库未启用新数据控制。保留用例避免后续把显式空集合重构为空逻辑组。

## 尚未完成与界限

- 完整资源/页面/操作/字段目录维护、组织授权完整 HTTP 验证、子表字段权限、仪表盘/组件/分类消费、导出、性能与全部验收场景仍在推进。
- 浏览器当前停留在登录页，会话已过期；已请用户在原本地页面正常登录，不收集密码，不绕过登录。不能把 React 测试冒称为真实浏览器 QA。
- 当前可复用候选：同作用域角色树防环、显式委派上限、批量事务、版本发布与回滚、空条件失败闭合。尚未晋升为公共模式。
- 不可直接复用：supply 的旧身份平台、供服业务分类、未实现按钮、旧范围配置以及组织专属数据；本项目也未引入 antd 或外部身份依赖。

下一步允许继续本地实现及验证；禁止对外部署、修改参考项目、自动资产晋升或宣称 Release。
