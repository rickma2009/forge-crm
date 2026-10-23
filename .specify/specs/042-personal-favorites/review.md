# 我的收藏：实现评审与验证记录

日期：2026-10-06

## 需求覆盖

- 集中持久化收藏关系，覆盖客户、产品、物料产品、商机、报价单和销售订单。
- 收藏记录只保留对象类型和 UUID；列表按收藏时间倒序，并从权威对象表批量读取当前名称或单号。
- 门户工具栏收藏入口与对象目录行操作已接入；取消列表收藏要求二次确认，成功后同步更新面板和来源行。
- 无单独收藏权限。收藏目标仍须通过现有查看授权和数据策略；写接口使用会话与 CSRF，取消只能影响当前用户、系统与租户。

## 评审角度

1. 需求：六类数据对象、列表字段、当前值显示、详情跳转、行操作与确认取消均已对应 AC-042-01..09。
2. 安全：API 不接受客户端 user/tenant/application ID；系统、用户、租户由服务端解析，唯一键防止重复，客户名称遵循客户读取范围和字段脱敏。多态目标不能使用单一外键，类型白名单和服务端作用域查询负责验证。
3. 集成：contracts、导航网关、门户 Provider、六类列表、API/Service、Prisma 模型和迁移均已实现。项目类型检查和前端生产构建通过。

## 验证证据

- `pnpm --filter @forge-crm/server typecheck`：通过。
- `pnpm --filter @forge-crm/web typecheck`：通过。
- `pnpm --filter @forge-crm/server test -- --runTestsByPath src/favorites/favorite.service.spec.ts`：3 项通过，覆盖当前名称与排序、幂等创建、用户/应用范围取消。
- `pnpm --filter @forge-crm/web test -- src/showcase/Favorites.test.tsx`：1 项通过，覆盖列表显示和确认后取消。
- `pnpm --filter @forge-crm/web build`：通过。构建提示既有大型 chunk 与重复静态/动态导入警告。
- `pnpm --filter @forge-crm/server exec prisma validate`：通过。
- `pnpm --filter @forge-crm/server db:migrate:deploy`：本地开发数据库成功应用唯一待执行的收藏迁移；之后 `prisma migrate status` 返回 schema up to date。直接查询 PostgreSQL 元数据核实主键、作用域外键、类型检查、复合唯一约束和排序索引。
- 全仓 `bash _methodology/scripts/verify-all.sh`：治理和前置验证通过，后续 `validate-demo-isolation.mjs` 因既有 `packages/web/src/showcase/InventoryStockPages.test.tsx` 命中远端 URL 禁止规则而失败。该文件不属于本功能改动。
- 全仓服务端 lint 存在多个既有错误；针对本次新增服务端/前端文件及改动页的检查仅发现原有 `InventoryPages.tsx` 与 `gateway.ts` 未使用变量，不在本次功能行内。

## 环境限制与未确认事项

- 浏览器已启动本地 Web/API，但现有 `admin` 与 `viewer` 登录均返回 `FORBIDDEN`（当前账号无系统访问授权），因此无法进入门户验收收藏入口。未通过重跑 seed 来改写演示用户/业务数据。收藏面板显示和取消确认由 jsdom 单测覆盖；浏览器详情跳转、真实授权用户端到端操作与键盘焦点仍待在已有授权账号下复核。
- 未执行生产发布；Release Gate 保持未批准。

## 资产归类

- 可复用候选：类型白名单 + 当前权威名称批量 resolver 的多态收藏关系实现。仅适用于用户偏好类、可由来源对象授权控制、且对象可删除或名称会变化的收藏；单个 Forge CRM 切片尚不足以晋升通用实现模式。
- 业务专属部分：六种 CRM/销售对象及其路由、对象名称字段和客户数据策略映射。
- 本次不回流通用模式；保留本功能 Spec、测试和验证限制作为候选证据。
