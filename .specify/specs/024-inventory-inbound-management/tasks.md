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


## 2026-09-24 单据详情整改完成记录
基于现有数据/API与权限，以DocumentWorkspace组合DetailHeader/DetailSection；抽取DetailBackButton，入库详情单独实现查看/编辑状态、主表+明细表格、保存与离开保护，Showcase壳登记守卫。无需数据库迁移。来源及当前需求见本切片spec与global-page-style/requirement.md。源归档、实现、规范/模板/检查、15项测试及桌面/窄屏浏览器验证完成；证据global-page-style/verification-document.md。全仓既有CONTEXT冲突不计为通过，无发布操作。
