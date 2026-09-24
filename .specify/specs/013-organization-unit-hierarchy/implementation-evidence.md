# 实现证据

## 数据库与 API

- migration `20260922130000_organization_unit_hierarchy` 已在本地 PostgreSQL 成功应用。
- 新版 Seed 连续执行两次成功，证明菜单、权限和组织初始化幂等。
- `RUN_DB_TESTS=1 ...`：12 suites、38 tests 全通过。
- 组织 API 集成覆盖：admin 导航含 `system-organization`、读取四级 Seed 树、新增组织、循环拒绝；viewer 导航不含该菜单且 GET 返回 403。

## Contracts、组件与工作区

- Contracts：3 files、10 tests 通过，其中组织契约 2 项。
- Web：33 files、173 tests 通过，其中组织页面 1 项、访问管理查询区 4 项。
- Server 标准测试：10 suites、22 tests 通过；数据库 16 项在标准 run 按配置跳过并已在独立 DB run 通过。
- `pnpm verify`：validate、lint、typecheck、test、build 全通过；Vite 仅保留既有大 chunk 警告。
- SDD full check 通过。

## 浏览器

- 本地 PostgreSQL、NestJS 和 Vite 已启动；演示入口已打开到 `http://localhost:5177/#/showcase/system/organization`。
- 未读取或暴露本地 `.env` 密码；当前停留在正常登录页。带身份视觉复核仍待用户登录。
