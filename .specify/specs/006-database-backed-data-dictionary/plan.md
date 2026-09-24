# Architecture Plan: 006

> 状态：`increment-approved-by-REQSRC-027-under-REQSRC-023-standing-authorization`

- 保持 `sys_dictionary`、`sys_dictionary_item` 双表；在字典表增加同系统父级外键和 `items_editable`，不新增第三张分类表。
- 管理 API 复用菜单操作 `system-dictionaries.manage` 的服务端鉴权；消费 API 需要页面访问会话但不授予管理权。
- 字典类别由 seed/upsert 维护；管理 API 保留兼容能力但不从演示页面暴露类别写入。字典值单条写入与批量导入复用同一校验器。
- Web 端使用工作簿解析库读取 `.xlsx/.xls`，只把结构化行提交给本地 API；服务端执行行级校验、重复检查和事务提交。
- 树形展示只从真实根节点递归，折叠节点的后代不进入兜底根列表；层级不参与字典值维护资格判断。
- Excel 导出直接使用当前 API 已返回的选中字典值生成工作簿，不增加写接口或服务端临时文件。
- 不复制外部字典平台客户端、缓存清理、同步、SQL 导出和固定根节点。
- 字典项停用采用逻辑状态，API 用 `includeDisabled` 仅服务历史解析/管理。
