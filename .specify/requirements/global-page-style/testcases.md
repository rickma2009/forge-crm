# 全局页面整改验收

| 用例 | 对应需求 / AC | 验证内容与失败边界 |
|---|---|---|
| TC-STYLE-01 | REQ-STYLE-01 / AC-STYLE-01 | 操作列只有语义图标，提示/名称存在；业务编码/名称/单号打开对应详情；只有查看能力时无操作列；权限、删除确认保留 |
| TC-STYLE-02 | REQ-STYLE-02 / AC-STYLE-02 | 普通按钮 32px/12px，行图标 28×28/16px，工具栏 32×32；内容放大、触控与 focus 可用 |
| TC-STYLE-03 | REQ-STYLE-03 / AC-STYLE-03 | 主次/危险/禁用/加载反馈；菜单按钮不选中错误节点；重复提交阻止 |
| TC-STYLE-04 | REQ-STYLE-04 / AC-STYLE-04 | 五个对象查询区、工具栏、网格与分页顺序；无新增权限不增加可写能力；详情直链可打开 |
| TC-STYLE-05 | REQ-STYLE-05 / AC-STYLE-05 | 首次系统默认，个人引用恢复；失效回退提示，无默认拒绝；用户/应用/对象隔离；新配置不能扩大基线 |
| TC-STYLE-06 | REQ-STYLE-06 / AC-STYLE-06 | 商机无分析/含竞争对手分析均符合严格契约；真实详情 GET 可解析；跟进/分析成功返回详情，失败与刷新可恢复 |
| TC-STYLE-07 | REQ-STYLE-07 / AC-STYLE-07 | 角色/组织/资源/字典双入口同目标同动作；右键非选中节点；外部/Escape/滚动关闭，键盘、边界定位与内置保护 |
| TC-STYLE-08 | REQ-STYLE-08 / AC-STYLE-08 | 已登记 17 个页面和 20 个页面/子组件源文件筛查；顶部页签六动作、去重、固定项、未保存守卫；只读和说明页明确例外 |
| TC-STYLE-09 | REQ-STYLE-09 / AC-STYLE-09 | 产品/商机/报价/竞争对手真实 API 保存与恢复个人列配置及分页，保存后显示有效名称与列；客户沿用同服务；关联报价不丢固定查询条件；初始化可重复、不覆盖配置 |

执行结果及未覆盖边界单独记录在 audit.md；以上清单不表示全项已执行或通过。关键行为由 BusinessDirectory/useTreeNodeMenu 测试、现有 route-tabs 测试、list-view.service 与 opportunity-detail-contract 测试及本地 API 脚本承担。无数据库 schema 迁移，本轮未重放全库 migration。
