# Gate Review

- Business Gate：APPROVED，依据用户完成 grilling 后的明确批准。
- Specification Gate：APPROVED，用户明确授权后续全部按推荐方案执行。
- Architecture Gate：APPROVED，用户明确授权数据迁移、权限和实现方案按推荐方案执行。
- Release Gate：APPROVED。依据用户“后面全部按推荐、默认同意并执行到开发完成”的明确授权，在实现证据形成后生效；不代表已部署到生产环境。

## 实现评审结论

- 需求追溯：`REQ-024-01`—`REQ-024-09` 已映射到 contracts、Prisma、API、RBAC、页面和测试证据。
- 数据安全：过账与冲销在 Serializable 事务内完成；库存余额与不可变流水同事务写入；命令使用 `requestKey` 幂等；库存明细无写接口。
- 集成运行：真实数据库完成入库过账、库存 `+1`、整单冲销与库存恢复；导航响应来自数据库并包含五个新增页面。
- 兼容性：产品、定价、附件和商机商品继续使用原 API 形态，权威主数据为 `md_item`。依赖表保存 `item_id` 关联，`item_code` 作为稳定业务编码和快照保留，权限统一挂到 `item-directory`。

## 2026-10-05 物料编码点号规则增量

- 来源与当前态：`REQSRC-104` 已归档，需求、Specification、验收用例、Architecture Plan、Tasks 和追溯已同步为“物料编码允许英文句点，逗号仍非法”。
- 实现：Contracts 将物料编码从通用编码 schema 分离；迁移 `20261005190000_item_code_dot` 已在本机应用，数据库检查约束为 `^[A-Z0-9_.-]{1,32}$`。
- 数据：执行前备份 `/private/tmp/forge-crm-before-item-code-dot-20261005.dump`；单事务恢复 70 条产品与 444 条物料点号编码，同时恢复 24 个 BOM 编码。
- 核对：514 条导入物料全部符合点号格式、旧连字符格式为0；BOM明细803条、替代料130条，物料孤儿和替代料孤儿均为0；审计请求 `item-code-dot-20261005-v1` 已记录。
- 静态验证：`@forge-crm/contracts` TypeScript 构建通过，目标文件 `git diff --check` 通过。未执行生产发布。

## 2026-10-05 物料产品自动编码与既有数据停用

- 规则：新建请求不再接受物料编码，大类和中类必填；服务端按中类完整编码和七位最大流水加一生成，停用历史记录参与最大值计算。
- 并发：以租户和中类 ID 获取 PostgreSQL advisory transaction lock，取号与物料写入在 Serializable 事务内完成；唯一约束继续作为最终防线。
- 页面：新增弹窗的编码字段改为只读提示，大类、中类设为必填；详情仍展示不可修改的已生成编码。
- 数据处理：备份 `/private/tmp/forge-crm-before-disable-existing-items-20261005.dump` 后，单事务停用 757 条启用记录（产品277、物料480），审计请求为 `disable-existing-items-20261005-v1`。处理后产品和物料启用数为0、停用数为759，半成品7条仍启用。
- 完整性：BOM共42个、明细905条、替代料133条，明细和替代料孤儿均为0。中类 `001.002` 当前最大流水为 `0035102`，下一流水计算结果为 `0035103`。
- 验证：Contracts构建、Server TypeScript检查、Web TypeScript检查和目标文件 `git diff --check` 通过；未运行自动化测试，未执行生产发布。
- 非阻断告警：生产构建仍报告主 JS chunk 超过 500 kB；既有 `ResourceMenuPage` 测试存在 React `act(...)` 警告。
- 工作台治理告警：`verify-all.sh` 因根目录同时存在 `CONTEXT.md` 与 `CONTEXT-MAP.md` 失败；这两个文件属于既有迁移资产，本切片未擅自删除。

## 仓库字典变更
本次最新实现与证据见 [review-warehouse-dictionaries.md](review-warehouse-dictionaries.md)。历史验收不代表本次重跑；全仓库门禁仍受已记录的领域布局问题阻塞。
