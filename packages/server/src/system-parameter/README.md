# 公共文本参数

系统管理：`/showcase/system/parameters`。存储sys_parameter单表，租户＋应用＋编码唯一。列表隐藏参数ID，仅值与状态可维护；无新增删除及候选API。

公共服务不判断业务含义，按原样文本读写；数字和日期也以字符串保存。不trim、不解析、不检查引用存在。空或停用返回null，数据库故障抛错；保留1000字符存储容量、权限、CSRF、版本和审计。

```ts
const raw = await parameters.getValue(systemCode, 'DEFAULT_LEGAL_ENTITY');
// raw可能是错误编码；业务调用方自行解释，找不到对应法人就没有默认值。
```

预设参数包括默认法人 DEFAULT_LEGAL_ENTITY、默认仓库 DEFAULT_WAREHOUSE 和商机阶段模板 OPPORTUNITY_STAGE_TEMPLATE。前两项填写业务编码。修改一项不会清空另一项。库存域的InventoryDefaultsService.getDefaults提供可选的按编码解析示例：同租户可用法人及其仓库，找不到返回null；它返回对象ID供业务使用，未接入既有单据。商机阶段模板参数填写模板编码，演示系统预设 public（公共）；新增商机及商机分析只使用调用时解析出的可用模板，找不到时提示先维护参数。其他类型由相应调用方解释，不能把保存字符串当作已通过业务验证。

初始化：先运行prisma migrate deploy，再运行scripts/init-system-parameters.ts（均在server包内）。初始化不覆盖已有值/状态。文本化升级迁移会将同租户可识别的旧对象ID转为编码，并记录审计；未知旧文本保持不变。

新增参数需登记稳定编码、预设说明与调用方解释规则；公共底座只负责存储。实际验证及既有空库迁移限制见 `.specify/specs/025-system-parameters/review.md`。
