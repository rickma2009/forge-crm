# 商机 AI 分析：功能、接入与验收

## 已确认的范围

商机详情 → 商机分析记录 → AI分析。基于当前商机、产品需求、启用跟进、已关联竞争对手、历史分析和本次补充，输出六部分：现状、客户需求与决策、竞争态势、问题风险、下一步行动、缺失信息。技术/产品/交期/成本等问题支持人工补充。第一期不跨商机检索，不联网，不调用工具，不自动预测精确成交概率，不自动修改阶段、概率或把握度。

生成任务写入 PostgreSQL，关闭弹窗不会取消；每个服务实例一次处理一个任务，使用 SKIP LOCKED 防止多个实例领取同一任务。运行任务超过8分钟标记失败（不盲目重发可能已计费的请求）；排队任务重启后继续处理。无效结构/虚假引用/输出截断均失败，不作为成功草稿展示。历史分析不能成为事实的唯一证据。

## 部署配置

管理员在服务器受保护的环境变量或仓库根目录 `.env` 配置：

```dotenv
AI_PROVIDER=anthropic
AI_BASE_URL=https://token.cvte.com
AI_AUTH_TOKEN=<由管理员安全注入，不写入Git>
AI_MODEL=CVTE-AUTO
AI_TIMEOUT_MS=120000
AI_MAX_INPUT_CHARS=100000
AI_DAILY_LIMIT=30
```

`.env` 已忽略；本机设置权限0600。生产环境用部署平台的secret注入，不通过网页返回凭证。配置修改后重启后端。AI_PROVIDER=mock 用于独立开发测试，所有模拟结果有明显标识，不应在生产启用。未配置凭证禁止生成，不自动降级到模拟服务。

兼容读取 ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN、ANTHROPIC_MODEL。用户提供的 Claude Code hooks、MCP、fastMode、model=opus[1m]、默认各档模型别名均属于客户端配置，不加载到CRM。API_TIMEOUT_MS=3000000不直接复用；后台单次请求默认120秒、上限180秒，避免长时间占用。429/502/503/529最多重试一次；网络超时不盲目自动重试。最近24小时每人默认30次，一个人同时一个生成任务。

按顺序执行：

```sh
pnpm --filter @forge-crm/server prisma:generate
pnpm --filter @forge-crm/server db:migrate:deploy
pnpm build
# 按现有项目方式重启服务
```

迁移新增独立 `ai-analyze` 操作，只自动授予启用的 `system-manager`。其他角色在角色权限管理中按需授予“AI分析”；确认保存还需要“新增分析”。全部接口检查商机页面查看权限及系统范围。当前项目商机本身采用应用级查看范围；如后续增加行级商机权限，需要在AI取数及worker执行前同步接入该策略。

## 协议及替换模型

本次使用 Anthropic Messages 协议：

```http
POST https://token.cvte.com/v1/messages
Authorization: Bearer <server-side token>
anthropic-version: 2023-06-01
Content-Type: application/json
```

```json
{
  "model": "CVTE-AUTO",
  "max_tokens": 8192,
  "system": "固定版本分析模板及输出约定",
  "messages": [{"role": "user", "content": "服务端构造的资料快照JSON"}]
}
```

网关路由可能返回不同的实际模型名称，任务保存配置模型，usage保存服务返回的resolvedModel和用量。不假设兼容网关支持厂商的全部结构化输出扩展，采用JSON约定+服务端Zod校验。未来新增供应商时扩展 `AiProvider`，业务界面、任务及保存逻辑无需改变。

官方协议参考：[Messages API](https://platform.claude.com/docs/en/api/messages/create)、[API authentication](https://platform.claude.com/docs/en/api/overview)。第三方网关的可达性、鉴权和模型路由需实测；协议匹配不等于已经连通。

## 接口

前缀 `/api/systems/:systemCode/opportunities/:id/ai-analyses`，沿用Session Cookie及写请求Origin/CSRF校验。

| 方法与相对路径 | 说明 |
|---|---|
| GET preview | 获取资料范围、时间、长度及不含密钥的配置状态 |
| POST test-connection | 仅发送“连接测试”，不包含业务资料 |
| POST / | requestId(UUID)、可选parentTaskId、focus、issues；返回持久化任务 |
| GET /?page=1 | 每页20条，只返回本人草稿与已确认的记录 |
| GET /:taskId | 查询进度、原稿、确认稿、输入快照及资料变化状态 |
| POST /:taskId/confirm | result、acceptStale；只有本人可确认，同一任务重复确认返回原记录 |

六部分结果结构：

```json
{"sections":[{"key":"summary","items":[{"text":"客户要求十月交付","kind":"FACT","sourceIds":["F:<跟进ID>"],"category":"交期"}]}]}
```

完整结果恰好包含summary/customer/competition/risks/actions/missing六个key。每部分1–15条，每条最多3000字；kind为FACT/INFERENCE/UNKNOWN，FACT必须有有效依据。上述示例仅展示一部分格式。来源通过id关联快照，后端拒绝不存在的引用，界面点击“查看依据”显示当时资料，而非会变动的当前记录。引用校验只能校验来源存在，内容是否被正确理解仍需人工审阅。

## 快照、保存与异常

输入快照使用一致性事务读取。资料超上限拒绝生成并明确告知，绝不静默裁剪。快照不包含API密钥、联系方式或系统鉴权信息。跟进中的自由文本可能含业务敏感内容，按授权范围发送。

`ai_analysis_task` 保存原稿、确认稿、模型/模板/结构版本、请求号、用量、时间、失败信息。`sd_opp_analysis` 通过aiTaskId关联，完整六部分写入JSON字段aiResult；旧摘要字段超过原有长度时显示“详见完整AI分析记录”，不截断完整内容。

任务确认使用数据库锁、唯一键和可串行化事务重试防重复保存。保存前比较业务资料hash；资料已变化返回409，用户可重新生成或明确保留旧快照。保存AI分析不会调用旧的人工分析回写阶段逻辑。

草稿仅发起人可见，正式结果与原稿/依据按商机查看权限可见。界面手工修改尚未确认时关闭会提示；修改内容尚未确认前只保存在当前页面，不是自动保存。浏览器意外终止仍可恢复AI原稿。

## 验证与排查

- `pnpm test`：项目测试；AI模块包括引用、响应、交互测试。
- `node scripts/test-ai-integration.mjs`：创建随机名独立临时库，建立当前schema、seed并附加AI约束；测试完成删除该临时库。不会改写业务库。使用模拟模型，无外发。
- 项目现有旧迁移 `20260922071848_add_role_tree_fields` 在空库缺少org_unit，故测试脚本不能用整链迁移创建空库；本次迁移需在已有正常项目数据库上部署，不能把该脚本当成完整历史迁移验证。
- “测试连接”成功后再用获准的商机样本生成，检查六部分、来源、编辑/保存及商机状态不变。
- 连接超时：检查服务器到token.cvte.com:443的路由、公司网络/VPN或防火墙；不要关闭TLS证书校验。
- 401/403：检查后端凭证和网关权限；错误页面不会回显密钥或上游响应原文。
- 429：限流，稍后再试；输出不完整/格式无效：保留失败任务，重新生成或检查网关模型兼容性。

## 页面样式

使用系统enterprise-modal弹窗；固定外框高度，正文内部滚动，滚动条预留位置。六部分通过留白、标题、分隔线组织，内容不重复套卡片。与客户详情一致的字段文字和按钮字号。使用清晰的事实/推断/待核实标记；不将模型提供商内部参数暴露为业务表单字段。

## 本次实现验证（2026-09-25）

- `pnpm test`：419项通过；默认套件跳过49项需要显式数据库环境的测试，其中本次新增的3项AI数据库测试已通过独立脚本单独执行。
- `node scripts/test-ai-integration.mjs`：3项通过，覆盖并发生成/确认去重、草稿隐私、资料变更、商机状态与版本不变、任务中断恢复、独立权限与CSRF。
- `pnpm build`、`pnpm lint`：通过；构建仍有前端大包体积提示。
- Chrome/Playwright隔离浏览器验收：1440×1000与390×844通过，验证补充问题、生成后关闭恢复、人工修改确认、原稿保留、弹窗不晃动与小屏幕边界。Browser插件未提供，使用现有Playwright运行时。没有发现页面运行错误。证据：`/tmp/forge-ai-browser/`（临时本机文件，不纳入仓库）。
- 本机业务库的AI增量迁移已执行，http://localhost:5173 与实际后端预览接口均返回200；后端配置为anthropic/CVTE-AUTO，凭证不回显。
- 真实模型尚未验证：Node与curl对token.cvte.com:443均连接超时，未进入鉴权阶段；因此不能声称凭证、网关协议及真实分析质量已验收。需恢复服务器到该网关的网络可达性后，先执行弹窗“测试连接”，再验证真实分析。
