# 切片 023 Architecture Plan

> 状态：待 Architecture Gate。本文只定义实现方案、迁移恢复和验证策略；未批准前不创建 Tasks 或业务代码。  
> 规格依据：[spec.md](spec.md)；数据库依据：`_methodology/11-数据库设计与数据分层规范.md` 与 TypeScript/PostgreSQL profile。

## 1. 架构目标与边界

在保留现有 `md_product` 产品身份、`sd_product_price` 历史价格和 `sd_quotation_line` 报价快照的前提下，完成三项纵向能力：

1. 产品列表弹窗新增，详情动态路由承载查看/编辑、定价、附件三个内部页签。
2. 定价从“最新版本”升级为按报价日期匹配唯一有效日期区间。
3. 新增公共附件模块，业务对象通过受控归属类型接入，不复制上传代码。

不引入 Ant Design、云存储 SDK、病毒扫描服务、汇率服务或新的应用框架。首期仍使用 React/Vite、NestJS、Prisma/PostgreSQL 和本地文件系统。

## 2. 模块责任与接口

```text
Product workspace (web)
  ├─ product API ──> opportunity/ProductController ──> md_product
  ├─ pricing API ──> quotation/PricingController ────> sd_product_price + sd_price_tier
  └─ AttachmentPanel ─> attachment/AttachmentController
                           ├─ AttachmentOwnerRegistry -> PRODUCT owner resolver
                           ├─ sys_attachment metadata
                           └─ FileStorage -> configured non-public directory

QuotationService ──> PricingService.resolve(productId, quoteDate, quantity, currency)
                     └─ quote line stores priceId + tier/suggested/transaction snapshots
```

- `opportunity` 模块仍是 `md_product` 的唯一写入责任模块；只在本切片增加详情、删除和引用统计。
- `quotation` 模块仍是销售价格与报价的唯一写入责任模块。
- 新建 `attachment` 公共系统模块，不能反向依赖产品控制器；使用 `AttachmentOwnerRegistry` 注册归属解析器。
- `PRODUCT` 解析器验证 `md_product` 的租户归属及产品页面权限。未来其他归属类型必须显式注册，不接受任意字符串。

## 3. 数据设计

### 3.1 现有价格表演进

`sd_product_price` 保持销售域所有权，新增/调整：

| 物理字段 | 类型 | 规则 |
|---|---|---|
| `pricing_type` | varchar(16) | `STANDARD` / `TIERED` |
| `currency_code` | char(3) | 首期仅 `CNY` |
| `unit_price` | decimal(18,2), nullable | 标准价必填，阶梯价必须为空；由旧 `standard_price` 重命名 |
| `effective_date` | date | 必填 |
| `expires_date` | date, nullable | 含当日，不早于生效日 |
| `status` | varchar(16) | `ACTIVE` / `SUPERSEDED` / `VOID` |
| `remark` | varchar(1000), nullable | 价格说明 |
| `updated_by` | uuid | 最后修改人 |
| `updated_at` | timestamptz(3) | 最后修改时间 |

数据库约束：

- 标准/阶梯头部值互斥检查；版本、价格、日期合法性检查。
- 启用 PostgreSQL `btree_gist`，使用排他约束禁止同一 `tenant_id + product_id + currency_code` 的 `ACTIVE` 日期区间重叠；闭区间按 `daterange(effective_date, expires_date + 1, '[)')` 表达。
- `sd_price_tier` 继续保存阶梯区间；数据库保证单行上下界和非负价格，服务事务保证首段为 0、连续、无重叠和末段无上限。
- `sd_quotation_line.price_id` 保持 `RESTRICT`，旧价格不能被报价级联删除。

存量迁移：每个产品的最新价格版本转为 `ACTIVE`，其 `effective_date` 使用该产品全部旧价格最早创建日期；其余旧版本转为 `SUPERSEDED`，保留 ID、阶梯和报价外键。这样延续旧系统当前价格行为，同时不制造日期重叠；历史报价仍通过 `price_id` 使用原快照。

### 3.2 新公共附件表

新建 `sys_attachment`，属于系统平台公共层，名称及全部字段不超过 32 字符：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | 附件 ID |
| `tenant_id` | uuid FK | 租户范围 |
| `application_id` | uuid FK | 应用范围 |
| `owner_type` | varchar(32) | 首期 `PRODUCT` |
| `owner_id` | uuid | 归属对象 ID，由注册解析器校验 |
| `original_name` | varchar(255) | 用户看到的原文件名 |
| `attachment_type` | varchar(16) | `PDF`/`EXCEL`/`IMAGE`/`OTHER` |
| `mime_type` | varchar(128) | 服务端验证后的 MIME |
| `file_size` | bigint | 字节数，必须 >0 |
| `storage_key` | varchar(512) | 相对存储键，全应用唯一 |
| `description` | varchar(1000), nullable | 附件说明 |
| `file_version` | varchar(64), nullable | 手工文件版本 |
| `status` | varchar(16) | `ACTIVE`/`DELETE_PENDING`/`DELETE_FAILED` |
| `version` | int | 乐观并发 |
| `created_by/updated_by` | uuid FK | 首次上传人/最后修改人 |
| `created_at/updated_at` | timestamptz(3) | 首次上传/最后修改时间 |

索引与约束：`(application_id, owner_type, owner_id, status, created_at)`；`(application_id, storage_key)` 唯一；应用/租户和用户/租户复合外键；大小、版本、状态检查。多态归属不能使用数据库 FK，因此以受控 owner registry、服务端存在性检查和定期一致性测试补偿，禁止业务绕过附件服务直接写表。

### 3.3 产品引用与删除

产品删除事务使用 `SERIALIZABLE`：

1. `SELECT md_product ... FOR UPDATE` 锁定目标并校验版本。
2. 统计 `sd_opp_product`、`sd_quotation_line`、`sd_product_price` 和 `sys_attachment` 的有效引用。
3. 任一引用存在返回 `409 PRODUCT_REFERENCED` 及四类计数。
4. 全部为零后执行带版本条件的删除并写审计。

现有 `sd_opp_product → md_product`、`sd_product_price → md_product` 为 `RESTRICT`。迁移补充 `sd_quotation_line(product_id, tenant_id) → md_product(id, tenant_id)` 外键，消除检查与并发插入之间的悬空窗口。

## 4. API 与契约

### 产品

- `GET /api/systems/:systemCode/products/:id`：返回产品详情。
- `PATCH /.../products/:id`：既有更新，继续要求 `version`。
- `DELETE /.../products/:id`：请求体 `{version}`；要求 `delete` 动作，成功 204，引用冲突返回结构化 409。

### 定价

- `GET /.../products/:productId/pricing`：返回产品、派生当前价格和历史版本。
- `POST /.../products/:productId/pricing`：新增完整价格版本；输入包含版本、类型、币别、有效期、备注和阶梯。
- `GET /.../products/:productId/pricing/suggestion?quoteDate=&quantity=&currency=CNY`：按业务日期解析；报价服务内部调用同一 domain 函数而非 HTTP 回环。
- `PricingService.reference(...)` 增加 `quoteDate` 并验证客户端提交的 `priceId` 就是该日期/数量应匹配的版本。

### 附件

- `GET /api/systems/:systemCode/attachments?ownerType=PRODUCT&ownerId=...`
- `POST /.../attachments`：`multipart/form-data`，字段为归属、说明、文件版本和单文件。
- `PATCH /.../attachments/:id`：只更新说明、文件版本和 `version`。
- `GET /.../attachments/:id/download`：鉴权后流式下载，设置安全文件名和 `nosniff`。
- `DELETE /.../attachments/:id`：请求体 `{version}`，使用删除状态机；重复请求幂等返回最终结果。

Zod 契约放在 `packages/contracts/src/attachment.ts` 和现有 `quotation.ts`、`opportunity.ts`。前端 gateway 不解析原始未知 JSON。

## 5. 文件存储与恢复

- 运行配置增加 `ATTACHMENT_STORAGE_ROOT` 和 `ATTACHMENT_MAX_BYTES`；默认开发根为仓库运行数据目录 `var/attachments`，最大 20 MiB。
- 正式存储键：`<owner-type>/<yyyy>/<mm>/<owner-id>/<attachment-id>/<safe-file-name>`；临时上传位于 `<root>/.tmp`，不得使用用户输入拼接绝对路径。
- 上传先写临时文件、校验大小/MIME/扩展名和空文件，再原子 rename 到正式键并写元数据；数据库失败时删除正式文件，清理失败记录结构化日志供巡检。
- 删除先将元数据标记 `DELETE_PENDING`，再删除物理文件，最后删除元数据；物理删除失败改为 `DELETE_FAILED`，列表显示失败状态并允许同一请求重试，不伪装成功。
- 应用启动只创建根目录和 `.tmp`，不公开静态映射。备份必须同时包含数据库和附件根目录；恢复顺序为数据库快照、文件目录、附件一致性扫描。
- `.gitignore` 增加 `/var/attachments/`；`.env.example` 增加配置说明，不提交真实附件。

## 6. 授权与审计

产品页面新增动作：`create`、`update`、`delete`、`price-view`、`price-manage`、`attachment-view`、`attachment-upload`、`attachment-update`、`attachment-delete`、`attachment-download`。现有 `manage` 迁移期只用于兼容，不作为新 API 的永久授权码；Seed 为 admin 角色授予全部动作，viewer 只获得产品和附件查看/下载。

动态路由 `/showcase/products/:id` 映射到 `/showcase/products` 页面权限。附件服务先验证动作权限，再通过 owner resolver 验证产品存在于同租户；任一步失败默认拒绝。审计写入 `sys_audit_log`，附件审计只记录元数据与结果，不记录文件正文、服务器路径或会话凭据。

## 7. 前端设计

- `ProductDirectoryPage` 保留查询和新增弹窗，移除列表内编辑弹窗；产品编码和查看/编辑动作打开 `/showcase/products/:id`。
- 新建 `ProductDetailPage.tsx`：顶部操作和三个内部页签；产品信息页使用查看/编辑状态与离页保护；标题固定“产品详情”。
- 将现有 `PricingEditor` 拆为可嵌入 `ProductPricingPanel`，表单展示类型、币别、单价、有效期、派生有效状态、备注和阶梯行。
- 新建公共 `AttachmentPanel.tsx`，只依赖 attachment gateway 和参数 `{ownerType, ownerId, allowedActions}`；产品页不包含专有上传逻辑。
- `ShowcaseApp`、动态路由授权和工作区 Tab 增加产品详情分支；页签标题不显示产品名称。

## 8. 迁移、部署与回滚

单一 Prisma 迁移 `20260923xxxxxx_product_price_attachment`：

1. 添加价格新字段为可空/带安全默认。
2. 回填类型、币别、有效期、状态和更新审计。
3. 将 `standard_price` 重命名为 `unit_price` 并按类型调整可空。
4. 添加检查、索引、排他约束和报价行产品外键。
5. 创建 `sys_attachment` 及约束。
6. 最后收紧非空约束。

部署前备份数据库；迁移验证旧价格/阶梯数、报价行 `price_id` 外键和建议价快照哈希。应用采用先兼容读取、迁移、再启用新写入的单版本本地交付。回滚优先应用回滚，不删除新表或新列；若必须数据库回滚，先确认不存在新类型/未来日期/附件元数据，否则停止自动回滚并导出数据。附件目录单独备份，数据库回滚不得静默删除文件。

## 9. 测试与验证

- Contracts：日期、类型互斥、阶梯、附件元数据和错误响应。
- Domain/unit：日期边界、时区无关的 `DATE` 比较、阶梯阈值、文件名安全化、路径 containment。
- 数据库集成：迁移回填、排他约束、四类删除引用、并发删除/引用、附件租户范围。
- API 集成：产品详情/删除权限；multipart 上传、下载头、更新、失败重试；报价按报价日期取价与快照不漂移。
- Web：列表跳转、三页签详情、编辑离页保护、价格表单、附件统一操作和权限按钮。
- 浏览器验证：admin 完整操作；viewer 只读；刷新产品详情；过去/未来价格；上传/下载/改说明/删除；有引用产品删除提示。
- 全量门禁：contracts/server/web test、typecheck、build，数据库治理检查、切片 `check-sdd full` 和必要浏览器 QA。

## 10. Architecture Gate 后的任务边界

批准后再创建 `tasks.md` 和 `docs/superpowers/plans/2026-09-23-product-workspace-pricing-attachments.md`，按以下可独立验证单元拆分：

1. 数据迁移与 contracts；
2. 有效期定价和报价取价；
3. 产品详情与受控删除；
4. 通用附件存储/API；
5. 产品工作区、定价和附件前端；
6. Seed/RBAC、集成回归、浏览器证据和 review。

执行方式已经选择为当前会话原生连续执行；每个任务遵守 RED→GREEN→REFACTOR，最后进行一次独立整体代码评审。
