# 工作流引擎基础 · P2.1

真实 Flowable 引擎，独立于CRM业务库与审批原型。此阶段提供受控内部协议，尚未启用销售订单工作流，浏览器不能直接调用内部接口。

## 运行

仓库根目录执行：

```bash
bash scripts/workflow/test.sh
bash scripts/workflow/start.sh
bash scripts/workflow/stop.sh
```

测试构建使用JDK21/Maven3.9.9，运行镜像仅包含JRE21，Flowable7.2.0、Boot3.5.4；独立PostgreSQL16，数据保留在命名卷。启动脚本首次生成 `infra/workflow/.env`（git忽略、权限600），不打印令牌。8091仅绑定127.0.0.1；没有浏览器入口，全部接口包括健康检查均要求 `X-Workflow-Service-Token`。停服务不删卷。start.sh先完成临时PostgreSQL测试和打包，再构建运行镜像。数据库自动建表只用于开发，不用于生产升级；备份和正式迁移另行验收。

构建镜像首次下载较大；公共仓库连接故障时可按运维规定使用可信镜像代理，校验相同digest。锁定摘要见 third-party/flowable/version-lock.json。

## 内部协议

- POST `/internal/workflows/commands`：scope={tenantId,applicationId}、requestId(UUID)、actorId，加命令字段。PUBLISH发布受限模板；START启动；APPROVE/RETURN/REJECT/TRANSFER操作任务；ACTION_RESULT回传业务执行结果。
- GET `/internal/workflows/instances/:id?tenantId=...&applicationId=...`：固定版本的完整graph、真实任务、等待业务动作、节点访问及审计。
- GET `/internal/workflows/health`：服务健康。

请求Schema见 packages/contracts/src/workflow/index.ts，Nest内部客户端见 packages/server/src/workflow/workflow-engine.client.ts。未注册公开Controller或入口；接入前门面必须验证当前用户、组织任职、数据权限、审批人有效性、转交职责、金额币种，并持久化requestId及启动outbox。服务令牌只给受信门面；actorId来自门面已认证用户，不能转发浏览器任意actorId。

START的businessKey必须是CRM审批申请/轮次ID，不能仅用订单号，终结后重提应产生新申请ID。同scope同businessKey只启动一次；同requestId同载荷返回原结果、异载荷409。超时结果不确定时以**同一requestId同一载荷**重试，不能生成新键。读取状态需再次校验调用用户的任务参与权。

金额仅人民币示范模板，比较使用十进制；恰等阈值走低分支。审批人由未来门面解析后传入，本阶段冻结人员快照；生产组织策略尚未接入。空人和自审被阻止；多人/并行、跨币种、委托、撤回、终止、跳过不在本基础切片开放。

## 业务执行与一致性

人工同意后停在receiveTask业务节点，waitingActions返回executionId。CRM消费方必须先以该ID建立唯一收件账本，**在业务本地事务内**修改单据并保存结果，再返回ACTION_RESULT。失败仍等待，匹配的成功结果才结束实例。该服务绝不自己改销售单据或扣库存；不能只因引擎已收到人工同意就显示订单已审核。

Flowable推进、命令响应、审计在同一Spring本地事务内。scope行锁使多个服务副本的竞争请求串行化；当前是每租户应用串行，适合首切片，扩容前需按聚合细化并发设计。无无限自动重试；业务门面的outbox、重放和异常队列属于P2.2。

## 图形复用

发布同时生成完整graph与BPMN DI，同一节点ID/位置/边布局。实例绑定不可变定义，查询包含未命中的分支。正式公共组件 `packages/web/src/common/workflow/ApprovalProgressDiagram.tsx` 同时接受设计和运行数据；运行只叠加状态。单据底部区域接入留待真实订单切片，不改变原页面。

## 维护边界

命名为sys_wf_*的表在**引擎独立库**，Java服务唯一写入；不是Prisma表。Flowable ACT_*为第三方数据库命名例外。仅初始化SQL，本阶段没有生产迁移/升级承诺。自有定义、实例、命令、审计均无删除接口。禁止在记录仍有效时清理命令账本，否则破坏防重。

可复用候选：受限编译、不可变图、命令防重、内部客户端。销售订单受限模板属于业务示例，不能直接作为任意对象审批规则；尚未通过跨项目验证，不晋升通用平台。
