# pg 事务关联查询警告：最小复现

2026-10-03，调查 AI 隔离库验证中的弃用警告。不是数据库功能变更，也不构成 pg 9 兼容声明。

## 证据与结论

执行 `NODE_OPTIONS=--trace-deprecation node scripts/test-ai-integration.mjs`，3 项测试仍通过；调用栈为 `pg Client.query → Prisma PgTransaction.performIO → queryRaw → query-interpreter`。当前安装版本为 pg 8.23.0、Prisma adapter-pg/client 7.9.1。警告表示同一个 client 尚有查询执行时又接到 query。

随后在两个独立进程中比较同一事务内的一次普通查询与一次 include 关联查询，应用代码均不使用 Promise.all：

| 模式 | 查询记录数 | 匹配警告次数 |
|---|---|---|
| plain | 1 | 0 |
| relations | 1 | 1 |

因此，当前依赖组合下，单次关联查询足以触发此警告；不能仅凭仓库搜索到 Promise.all 就归因于业务层。本结果不排除业务并行查询在其他场景也触发同类问题，不证明所有 include 都会触发。

## 复现入口

[诊断脚本](../../packages/server/scripts/probe-pg-query-warning.ts)只读一条商机及其关联，不输出业务字段，仅输出模式、记录数和警告计数。不使用模型、不写数据库。使用已有合成数据的本机开发库，命令在仓库根目录执行：

```sh
pnpm --filter @forge-crm/server exec tsx scripts/probe-pg-query-warning.ts plain
pnpm --filter @forge-crm/server exec tsx scripts/probe-pg-query-warning.ts relations
```

需先具备项目依赖、生成的 Prisma Client 和数据库连接；关联数据为空时可能无法重现。必须使用独立进程，因为驱动的弃用提示按进程去重，不能在同一进程比较警告次数后误判。

## 处理边界与团队练习

本轮保留警告，不通过屏蔽日志或随意改为串行来宣称修复，也不直接升级依赖。后续升级前应在隔离环境比较候选依赖组合、查询正确性及并发行为，再决定适配策略。当前没有证据证明已经解决兼容性问题。

练习重点：观察警告 → 获取调用栈 → 提出业务并行与 ORM 关联查询两个假设 → 用最小实验区分 → 记录仍未知的部分。把源码搜索作为线索，把真实复现作为判断依据。此方法可复用，具体版本和数据形态不能外推。
