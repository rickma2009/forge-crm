# Architecture Plan: 008

> 状态：`approved-by-REQSRC-023-default-authorization`

- 新增 `crm_customer`，字典字段存稳定值，销售存 key/name 快照，`version` 支持乐观并发。
- 客户写接口通过 `customer-directory.create/update` 服务端操作鉴权。
- 编码生成在 Serializable 事务中锁定月份序列；实现使用已有编码最大值并对唯一冲突重试。
- 销售 Provider 使用后端受控配置数组，接口契约未来可替换为员工目录。
- Web 以通用列表组件装配客户列、筛选、编辑抽屉和详情抽屉。
