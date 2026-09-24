# 入库单详情与通用单据规范验证（2026-09-24）

来源：`.specify/sources/2026-09-24-document-detail/original.md`。
追溯：REQ-DOCUMENT-DETAIL-01 → UI-DOCUMENT-01 / UI-BACK-01 → AC-DOCUMENT-DETAIL-01 / TC-DOCUMENT-DETAIL-01。

## 已确认并实施
- 入库详情默认单页，无基本信息/明细双Tab；主表标签在上、控件在下，明细表格在下方。
- 共用DocumentWorkspace/DetailHeader/DetailSection；客户与单据的返回都使用DetailBackButton，组件自身明确32px边框/圆角及16px图标，触控44px。
- 仅草稿且拥有update权限可进入编辑，编辑按钮变保存；查看态无新增行/操作列，编辑态行内维护、添加及删除图标可用；单号/状态/币别保持只读。
- 版本随保存提交，成功回查看，失败保留表单。取消恢复原始数据。页面离开/路由关闭/刷新接入壳registerGuard，浏览器关闭提示，保存时避免并发提交。
- 过账/作废/冲销沿用既有状态与权限，编辑时隐藏生命周期操作；API与数据库规则不变。新增单据流程未改为详情编辑，不扩展调拨能力。

## 执行证据
- InboundOrderDetailPage.test.tsx：8项通过，覆盖查看无Tab/无操作列、编辑/新增/删除/保存版本、冲突保留与空明细校验、POSTED/REVERSED/VOIDED及无update权限、未保存保护/取消。
- InventoryPages.test.tsx：5项通过；DetailWorkspace.test.tsx：2项通过。合计15项。
- Web TypeScript typecheck通过。
- scripts/document-detail-browser-qa.mjs：1440px/390px查看及编辑、客户同款箭头几何/图标、主表在上明细在下、无整页溢出、添加/删除、模拟保存后回查看、取消及返回仅确认一次、无JS异常通过。模拟草稿和PATCH响应只存在于浏览器拦截，真实法人/仓库/物料仅只读查询；businessWrites=0。未将模拟保存宣称为真实数据库持久化验收。
- 截图与测量：`/tmp/document-detail-qa/view-1440.png`、`edit-1440.png`、`view-390.png`、`edit-390.png`、`result.json`。已查看桌面查看/编辑和窄屏截图。
- 全仓verify-all：公共样式检查通过；仍因根CONTEXT.md与CONTEXT-MAP.md并存失败，未改动该独立治理问题。

## 复用、边界与状态
样式总文档、AGENTS/初始化模板、工作区模板、金标准说明与自动检查已同步。可跨项目复用单页主从布局、编辑状态显示规则、返回控件及验收方法；不可直接复用草稿状态、币别锁定、库存过账权限/API等业务口径。本次确认范围内无待定规则。Specification按本次明确实施指令完成；未变更数据结构/安全架构，无Release操作。未来单据默认遵循规范，既有其他单据未声称已全部迁移。
