# Architecture Gate Review: 006

决策：approved。证据：`REQSRC-023`。采用本地 PostgreSQL 双表、逻辑停用、管理/消费接口分离；排除参考系统外部平台和运维 API。

## REQSRC-026 增量评审

决策：approved-under-standing-authorization。`REQSRC-026` 改变字典层级和批量导入边界，因此重新评估 Specification/Architecture；依据 `REQSRC-023` 对后续推荐默认选择及连续实现的用户授权批准以下方案：

- 双表不变，在字典表用同系统自关联表达父级；避免增加只承担树导航的第三张表。
- 内部 UUID 与人工设置的数据字典 ID 分离；既有 `dictCode` 继续承担稳定数据字典 ID，避免破坏业务消费接口。
- 类别配置由迁移/seed 管理，UI 只读；值维护仍受 `system-dictionaries.manage` 角色操作权限约束。
- Excel 仅在浏览器解析为结构化行，本地 API 做最终校验和事务写入；不把电子表格二进制保存进数据库。
- 排除物理删除、外部字典平台同步、缓存运维接口、值级级联关系和生产发布。

## REQSRC-027 增量评审

决策：approved-under-standing-authorization。`REQSRC-027` 不改变双表、认证、角色授权或系统边界；批准以真实根节点递归修复折叠、让层级与值维护资格解耦，并在浏览器使用已授权查询结果生成 Excel。固定初始化字典仍由 `itemsEditable=false` 控制，避免把“层级不限”错误扩大为取消固定值边界。
