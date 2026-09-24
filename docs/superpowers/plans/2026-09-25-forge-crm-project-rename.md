# Forge CRM 项目身份迁移计划

来源：REQSRC-073  
架构决策：ADR-007

## 全局约束

- 不改业务逻辑、API、表结构或数据内容。
- 不改写 `.specify/sources/`、完成态 Gate 与历史证据中的旧名称。
- 保留 SDD Forge 方法论标识和 PostgreSQL 兼容身份。
- 不删除 lockfile，不自动 seed、reset 或新建空数据库。
- 外部远程创建和 push 属于最后一步；缺少账号命名空间或可见性时停在本地已就绪状态。

## Task 1：建立改名前基线

1. 记录当前验证结果和已知方法论检查问题。
2. 将此前根目录迁移和业务功能形成独立基线提交。

## Task 2：工程标识改名

1. 先增加项目身份自动检查并确认旧状态失败。
2. 更新根 package、四个 workspace package、内部 import、TypeScript、Vite、脚本和活动 CI。
3. 原位更新 lockfile 和 workspace 链接。

## Task 3：运行与文档兼容

1. 更新当前 README、AGENTS、CONTEXT、本地启动文档和浏览器标题；移除与根上下文重复的旧 CONTEXT-MAP。
2. 固定 Compose 旧项目身份，保留原容器、数据卷、数据库和用户。
3. 更新活动方法论脚本的根级工程路径；保留历史资产标识。

## Task 4：验证与提交

1. 运行身份检查、启动脚本测试、workspace verify、方法论检查和 Compose 配置检查。
2. 核对数据库健康和原数据可访问性。
3. 提交纯改名变更。

## Task 5：目录与远程

1. 停止本项目开发服务，将目录移动到 `/Users/malanjun/Documents/forge-crm`。
2. 从新目录做只读 Git 与启动前检查。
3. 在明确账号命名空间和仓库可见性后创建 GitHub/Gitee 仓库并配置远程；否则报告唯一剩余阻塞。

## 执行状态（2026-09-25）

- Task 1—4 已完成并通过应用与方法论验证；
- Task 5 的本地目录移动在改名提交之后执行；
- GitHub/Gitee 建仓、远程配置和首次 push 仍需明确账号命名空间与可见性，且不得默认公开。
