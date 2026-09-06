# Business Gate 评审：企业工作区与可配置客户目录

> 评审对象：`requirement.md` v0.1-rc1
> 状态：`approved`
> 决策人：Rick
> 来源：`REQSRC-022`

## 1. 评审范围

- 取消 004 的特殊底部管理菜单，改为单棵普通菜单树；
- 新增无搜索框的常驻工具栏和路由多页签；
- 新增本地数据字典、系统/个人列表视图和标准查询列表；
- 以客户目录验证真实 PostgreSQL CRUD；
- 继续沿用纯角色授权，排除数据范围和员工信息表。

## 2. 完整性结论

| 检查项 | 证据 | 状态 |
|---|---|---|
| 目标、痛点和范围 | `requirement.md` §1—§2 | ready-for-review |
| 角色和主流程 | `requirement.md` §3 | ready-for-review |
| 工作区行为 | `FR-501`—`FR-503` | ready-for-review |
| 字典业务规则 | `FR-504` | ready-for-review |
| 系统/个人视图 | `FR-505`—`FR-507` | ready-for-review |
| 客户字段与操作 | `FR-508`—`FR-510` | ready-for-review |
| 来源事实/推断/未知 | `transformation.md`、`UID-002` | ready-for-review |
| 与 004 的冲突 | `transformation.md` §6 | ready-for-review |
| 阻断决定 | `Q-501`—`Q-513` | resolved-by-REQSRC-023 |

## 3. 方案确认结论

该设计可行，但不应把四个能力压成一次大实现。建议先批准总业务边界，再按依赖顺序推进：

```text
005 单树菜单 + 工具栏 + 多页签
→ 006 本地数据字典
→ 007 角色范围系统视图 + 个人视图 + 通用列表
→ 008 客户目录数据库 CRUD
```

这样每一步都有可运行结果，并能在客户域接入前先验证通用能力。来源系统真实数据库不是依赖，也不会被访问。

## 4. 建议决定

同意 `Q-501`—`Q-513` 推荐答案并批准本 Business Gate。批准边界仅允许：

1. 为 `005-unified-navigation-toolbar-tab-workspace` 创建 Specification 与验收草案；
2. 评审通过后再形成对应 Architecture；
3. 后续 006—008 依次重复 Specification/Architecture Gate。

不批准：现在直接修改 Schema、创建 SQL、编码、连接参考数据库、部署或把 UID-002 晋升正式模式。

## 5. 人工决定

- 结论：approved
- 决策人：Rick
- 批准时间：2026-09-04T01:22:17+08:00
- 已确认：`Q-501`—`Q-513` 全部推荐答案
- 批准证据：`REQSRC-023`
- 连续实施授权：后续本地 Gate 可采用评审材料推荐/默认值继续推进；仍须留下阶段文档和真实验证。
