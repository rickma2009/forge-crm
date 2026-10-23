# 组件目录增量维护命令

用于把 `_methodology/components/index.json` 的更新同步到**已初始化的本机系统**。它不新建缺失组件、不更新 TPL 页面模板、不初始化用户或业务数据，不清理退役条目，也不晋升资产成熟度。

## 使用

仓库依赖已安装、Prisma 客户端已生成、本机 PostgreSQL 可访问，根 `.env` 中 DATABASE_URL 指向本机。环境变量优先于 .env，不输出连接串。显式指定现有启用系统，从仓库根目录运行：

```sh
pnpm --filter @forge-crm/server exec tsx scripts/sync-component-library.ts --system demo-portal
```

默认预览，输出组件编码和变动字段名，不输出评审内容或凭证。确认差异符合本次源码修改后执行：

```sh
pnpm --filter @forge-crm/server exec tsx scripts/sync-component-library.ts --system demo-portal --apply
```

每次执行重新计算差异，不把前一次预览当作锁定版本。无差异时跳过更新，避免无故刷新 updatedAt。只有 localhost、127.0.0.1、IPv6 回环地址可用；本命令不提供远程数据库覆盖开关。

## 字段与事务边界

初始化及增量维护共用 `componentLibraryEntries` 的源码字段：名称、说明、分类、templateJson、definitionJson、definitionRefJson、artifactsJson、sortNo 等。实际字段以该函数为准，禁止在 CLI 再复制一套定义。增量维护只更新有差异的记录，并记 `updatedBy=component-library-maintenance`。

在 Serializable 事务中读取目录、计算差异、更新、再次比较。除了计划中的源码字段和更新审计时间/主体，其他字段都必须与事务开始时一致；人工证据、成熟度、状态、备注、ID、创建信息，以及没有更新的条目都受保护。异常抛出，事务不能提交；并发冲突不自动重试，先查清再重新预览。

缺少组件登记时返回 `EXISTING_COMPONENT_REQUIRED`，应判断该系统是否需要首次初始化，不自动调用全库 seed。源码路径或元数据无效时由现有目录加载校验拒绝。当前实现读取全部 styleScene 行用于检查其他系统和模板记录，适合本地小型目录维护；不是大量资产的线上同步方案。

同步完成后仍应检查真实目录页、复制参考指令及证据适用性。保留人工记录不意味着旧证据对新源码仍有效；不修改旧哈希来消除 STALE。

## 2026-10-03 实际验证

- `pnpm --filter @forge-crm/server exec jest --runInBand component-library-maintenance.spec.ts template-library.seed.spec.ts`：2 个文件、10 项通过（2.618 秒）。覆盖默认预览/参数拒绝、无差异、精确源码字段差异、缺少登记拒绝、评审及其他系统/模板保护、来源更新一致性，并保留原初始化测试。
- `pnpm --filter @forge-crm/server exec tsc --noEmit -p tsconfig.scripts.json`：退出 0。
- 本机 demo-portal 预览与显式 apply 均输出 `changes: []`；这两次走无差异分支，没有执行目录 update。
- 首次单元测试出现一次夹具误报：Jest 中 structuredClone 生成不同执行上下文的对象原型，Node 严格比较不相等。改为独立的浅层行副本（测试仅替换行字段）后通过，没有降低生产比较要求。

上述第一阶段的真实数据库验证仅覆盖已有目录读取与无差异分支；此前临时同步脚本的成功不自动转移给新 CLI。后续隔离数据库证据如下，未运行全量测试或业务过账。

### 后续隔离数据库验证

仓库根运行 `node scripts/test-component-library-integration.mjs`。脚本要求本机 PostgreSQL，创建随机 `sdd_catalog_<随机值>` 数据库，使用 Prisma db push 和合成 seed；把隔离地址传给 Jest 以及实际 CLI 子进程。默认 Jest 跳过此集成文件，文件内部也检查数据库名和本机地址。finally 只删除本轮成功创建的库，强制终止时仍需按日志中的确切库名核对；不按前缀批量清理。此流程不验证完整迁移升级。

2026-10-03 实际执行 2 项通过（Jest 11.134 秒），来源为[真实 CLI 集成测试](../../packages/server/src/style-scene/component-library.integration.spec.ts)：

| 场景 | 实际断言 |
|---|---|
| 预览、非空同步及重复执行 | 将两个组件的说明改为旧值，写入评审证据/状态/备注，并加入另一个系统的同编码记录；预览后全表快照不变，apply 更新两条源码说明、保留人工字段和其余全部记录；再次 apply 后全表（含 updatedAt）不变 |
| 第二条更新被数据库拒绝 | 隔离库对 CMP-02 增加真实 CHECK 约束；CMP-01 的 AFTER UPDATE 触发器递增测试序列，序列结果证明第一条更新已执行；CLI 非零退出且报告对应约束，整张目录表与更新前快照一致；删除故障设施后原命令成功 |

故障标记使用序列而非普通测试表：本次观察到回滚后序列仍记录一次调用，而所有目录行均回到原值。测试设施仅在隔离库存在，不写入生产 schema/迁移，不把该标记方式用于业务编号或业务数据。约束、触发器、函数、序列最终删除，库 `sdd_catalog_b021ee173658` 由 runner 清理，并另查 pg_database 确认不存在。

### 后续并发人工编辑验证

同日扩展上述命令至 3 项测试，全部通过（Jest 15.678 秒）。新测试通过两个独立数据库连接与真实 CLI 子进程，安排以下确定时序：

1. 两个组件说明仍待同步；CLI 已读取目录快照并完成第一条 UPDATE。
2. 第一条更新的 AFTER UPDATE 测试触发器等待咨询锁；另一个连接已持有该锁。测试查询 pg_locks，确认 CLI 确实处于等待，而非只等待固定毫秒数猜测时序。
3. 独立连接更新第二条组件的人工备注、证据和版本，并提交。
4. 释放锁后，CLI 尝试更新第二条，收到写入冲突并非零退出。此时全表快照只含人工修改，第一条源码更新没有残留。
5. 删除测试触发器/函数后，重新预览再显式 apply。源码说明更新成功，人工备注、新证据及人工提交的版本号保留。

此测试锁只用于隔离库安排交错时序，不是维护命令的生产锁策略；命令仍使用 Serializable，不自动重试。测试没有修改生产业务代码。测试库 `sdd_catalog_dc3baeb598d2` 由 finally 删除，另查 pg_database 确认不存在。

现在取得了非空更新、数据库故障回滚和上述一种人工并发编辑时序的证据；仍未验证连接中断、两个 CLI 同时同步、大量人工写入压力、线上迁移或远程数据库。三项测试不代表所有事务异常已覆盖，发生冲突后应重新预览，不盲目重试。

可复用思想：默认预览、明确作用域、单一来源字段定义、只写差异、保护非维护字段与可观察失败。表名、系统编码、目录规模和 local-only 策略属于本项目；其他项目须自行确认。培训入口：[初始化与维护权案例](../training/cases/catalog-seed-ownership.md)。
### 实际目录非空维护（2026-10-03）

补充 CMP-10/11 接入步骤并登记 CMP-15 自有 CSS 后，正式 CLI 在本机 demo-portal 预览到恰好三条差异：CMP-10/11 的 templateJson，CMP-15 的 templateJson/artifactsJson。apply 提交并通过保护字段与其他记录比较；随后只读预览 changes=[]。这次实际使用补充了早期本机仅走无差异分支的记录；不替代上面的隔离库故障和并发测试。浏览器范围见[目录展示验证](component-adoption-catalog.md)。
