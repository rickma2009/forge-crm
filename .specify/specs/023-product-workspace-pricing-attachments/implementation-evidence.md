# 实施与验证证据：023 产品工作区、有效期定价与通用附件

> 证据日期：2026-09-23（Asia/Shanghai）  
> 结论：实现和本地验证完成，等待 Release Gate；不代表生产发布。  
> 边界：证据来自当前仓库、本地 PostgreSQL 与本地演示服务，没有修改外部参考项目。

## 1. 已实现

- 产品新增继续使用弹窗；查看和编辑统一进入标题固定为“产品详情”的工作区，并提供产品信息、产品定价、附件三个页签。
- 产品删除在提交时由服务端事务校验商机、报价、定价和附件四类引用；存在引用时返回稳定的 `409` 明细，不依赖前端判断。
- 销售定价支持标准/阶梯、CNY、单位、单价、有效期、当前有效状态、阶梯数量区间、备注和历史版本；数据库排斥约束阻止同一产品有效期重叠。
- 报价选价和提交校验均使用报价业务日期；报价行继续保存当时价格快照，后续调价不会静默改写历史报价。
- 新增参数化 `AttachmentPanel`，按归属类型和归属 ID 接入；后端覆盖上传、列表、下载、说明/版本编辑、删除和失败状态，物理路径受根目录约束并使用临时文件原子落盘。
- admin 权限来自系统管理员角色；viewer 获得产品、定价、附件读取与下载能力，没有新增、修改、删除、维护定价或上传入口。

## 2. 数据与接口证据

- Prisma 新增/扩展 `sd_product_price` 与 `sys_attachment`，迁移 `20260923190000_product_price_attachment` 已在本地 PostgreSQL 成功应用。
- `pnpm db:seed` 重复执行成功；产品页面权限种子已包含产品 CRUD、定价、附件的细粒度动作，viewer 只获得只读动作。
- 动态路由 `/showcase/products/:id` 映射回产品页面权限；最新服务启动日志确认附件、定价、产品和认证路由均已注册。
- 附件存储根目录通过运行配置管理；仓库忽略运行时附件目录，仅保存元数据表和受控下载接口。

## 3. 自动验证

| 验证 | 结果 |
|---|---|
| Contracts | PASS：28 tests |
| Server unit | PASS：21 suites / 62 tests；4 个需独立数据库的 integration suites 按既有环境策略跳过 |
| Web | PASS：41 files / 203 tests |
| `pnpm verify` | PASS：Registry、隔离、lint、typecheck、test、build 全通过 |
| Showcase registry | PASS：17 pages / 44 capabilities |
| Database governance | PASS |
| `check-sdd.sh ... full` | PASS：结构、Gate、追溯及 TASK 覆盖全部通过 |

Vite 构建仍报告既有的大 chunk 警告，但命令退出码为 0；本切片没有将该警告声明为已消除。

## 4. 真实浏览器证据

- admin：产品列表显示新增、查看和修改；进入产品详情后显示删除、修改、维护定价和上传附件。
- 定价弹窗实际显示定价类型、CNY、标准含税价、生效/失效日期、当前有效、备注和保存操作。
- 附件实际完成上传、生成受控下载地址、编辑说明/版本、删除；验收后测试附件记录与物理文件已删除。
- viewer：产品列表只有查看；详情无删除/修改，定价无维护入口，附件无上传/编辑/删除入口。
- 截图：`evidence/admin-pricing-modal.png`、`evidence/admin-attachment-list.png`、`evidence/viewer-product-detail.png`。

### REQSRC-069 界面对齐增量

- 先将用户截图与变更要求归档到 `REQSRC-069`，再回写完整产品需求、切片 Spec 与 `TC-2301`。
- 产品列表的查看/修改已复用客户列表 `ActionIcon`，页面不显示操作文字，但保留 `aria-label` 与 `title`。
- 产品详情已改为客户详情同款结构：返回箭头、产品名称/状态首行、产品编码识别信息次行、右侧动作区、下划线页签以及双列浅色只读字段。
- 页签使用 `tablist/tab/tabpanel` 语义并支持方向键、Home、End；进入编辑态时字段位置不变，保存/取消移动到顶部动作区。
- 专项测试实际经历 RED 后通过：2 files / 7 tests；随后完整 `pnpm verify` 通过，Web 保持 41 files / 203 tests。
- 浏览器在 1920×1080 下以 admin 实际登录验证列表图标和详情布局。证据：`evidence/product-list-action-icons.png`、`evidence/product-customer-style-detail.png`。

## 5. 已知边界

- 通用附件的首个批准归属类型是产品；组件和服务边界已参数化，但其他业务实体接入仍应由对应需求切片登记权限和保留策略。
- 当前本地文件存储不等于对象存储、病毒扫描、内容审查或生产备份方案。
- 没有完成规定规模的性能测试、备份恢复演练、外部环境部署或独立人工评审，因此 Release Gate 保持未批准。
- 根级 `_methodology/scripts/verify-all.sh` 会被仓库既有的根 `CONTEXT.md` 与 `CONTEXT-MAP.md` 同时存在问题提前阻断；该问题不由本切片静默修改。

## 6. 可复用与不可直接复用

可复用：业务日期选价、有效期不重叠约束、报价快照、服务端引用删除保护、参数化附件归属、路径穿越防护、角色动作权限和 admin/viewer 验收清单。

不可直接复用：当前产品字段、CNY 单币种默认、报价业务规则、演示角色种子、本地磁盘目录和 CRM Showcase 路由/样式；目标项目必须重新批准这些业务与部署决策。
