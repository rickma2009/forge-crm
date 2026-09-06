# Specification Clarification: 006 REQSRC-026/027 Increments

| ID | 问题 | 采用答案 | 状态 |
|---|---|---|---|
| `Q-DICT-601` | “数据字典 ID”是否等于内部主键？ | 否；`dictCode` 是人工设置、业务可见的稳定 ID，内部 UUID 只做关联 | approved-under-REQSRC-023 |
| `Q-DICT-602` | 两表下怎样表达父级？ | 字典表同系统自关联，不增加第三张分类表 | approved-under-REQSRC-023 |
| `Q-DICT-603` | 类别能否在页面维护？ | 首期只由迁移/seed 初始化，页面只读 | approved-under-REQSRC-023 |
| `Q-DICT-604` | “部分固定值”怎样控制？ | 字典级 `itemsEditable`；固定或停用字典在 UI 和服务端均拒绝值写入 | approved-under-REQSRC-023 |
| `Q-DICT-605` | Excel 怎样导入？ | 浏览器解析 `.xlsx/.xls` 为结构化行，服务端再校验并事务写入 | approved-under-REQSRC-023 |
| `Q-DICT-606` | 导入遇到错误怎样处理？ | 返回行号；任一行错误整批不写入 | approved-under-REQSRC-023 |
| `Q-DICT-607` | 是否复制参考系统同步、缓存、导出、删除？ | 不复制；本地验证场只保留树、详情、值表和弹窗维护 | approved-under-REQSRC-023 |
| `Q-DICT-608` | 有下级的字典是否只能作为目录？ | 否；层级只决定展示关系，每一级均可按自身维护属性保存字典值 | approved-under-REQSRC-023-and-REQSRC-027 |
| `Q-DICT-609` | 左侧是否显示数据字典 ID？ | 不显示，只显示面向用户的字典描述、状态和层级 | approved-under-REQSRC-023-and-REQSRC-027 |
| `Q-DICT-610` | Excel 导出范围是什么？ | 导出当前选中字典从数据库读取的全部值，列结构与导入模板一致 | approved-under-REQSRC-023-and-REQSRC-027 |

上述答案来自 `REQSRC-026`、`REQSRC-027` 的明确需求，并由 `REQSRC-023` 的连续实施与推荐默认项授权覆盖。
