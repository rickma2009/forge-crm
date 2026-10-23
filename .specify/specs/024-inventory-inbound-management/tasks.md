# Tasks

- [x] T01 归档来源并整合完整需求
- [x] T02 完成 Specification 与 Architecture Plan
- [x] T03 建立 `md_item` 与旧产品引用迁移
- [x] T04 建立法人、仓库、入库、余额、流水和事件表
- [x] T05 实现 contracts 与数据库领域规则测试
- [x] T06 实现主数据和入库/库存后端 API、权限与审计
- [x] T07 实现菜单、列表、详情、行弹窗与库存查询页面
- [x] T08 初始化演示数据和角色权限
- [x] T09 执行迁移、测试、构建和 API/数据库初验
- [x] T10 回写追溯、实现证据和 Release Gate 状态

- [x] TASK-WDICT-01：预设初始化、仓库字典选择/中文显示/后端校验，专项验证与需求回写。
- [x] TASK-ITEM-REF-01：物料来源与生命周期字典、稳定编码字段、列表/详情解析、既有列表视图增列及幂等字典初始化。
- [x] TASK-ITEM-REF-02：更新数据库治理规范、Prisma Profile、Plan 模板、金标准案例、自动检查与需求追溯。
- [x] TASK-ITEM-REF-03：本机 PostgreSQL 迁移与 demo-portal 专项初始化完成；Prisma 状态、字段、视图配置及字典项已核对，重复初始化幂等；Server/Web 专项测试通过；Chrome 已登录物料目录并确认两项新列在默认视图配置中启用。生产发布不在范围内。
- [x] TASK-ITEM-CODE-DOT-01：归档 REQSRC-104，更新当前需求、规格、验收与追溯；拆分物料专用编码契约并新增数据库约束迁移。
- [x] TASK-ITEM-CODE-DOT-02：备份本机数据库，应用迁移并在单事务内恢复本批 Excel 演示物料及 BOM 的点号编码，完成数量、引用和孤儿核对。
- [x] TASK-ITEM-AUTO-CODE-01：归档 REQSRC-105，更新当前需求、规格、验收、Plan 与追溯；实现新建契约、服务端分类流水取号和前端自动编码交互。
- [x] TASK-ITEM-AUTO-CODE-02：完成针对性静态验证；备份本机数据库，在单事务内停用既有产品与物料并记录审计，核对半成品和 BOM 未变化。


## 2026-09-24 单据详情整改完成记录
基于现有数据/API与权限，以DocumentWorkspace组合DetailHeader/DetailSection；抽取DetailBackButton，入库详情单独实现查看/编辑状态、主表+明细表格、保存与离开保护，Showcase壳登记守卫。无需数据库迁移。来源及当前需求见本切片spec与global-page-style/requirement.md。源归档、实现、规范/模板/检查、15项测试及桌面/窄屏浏览器验证完成；证据global-page-style/verification-document.md。全仓既有CONTEXT冲突不计为通过，无发布操作。
