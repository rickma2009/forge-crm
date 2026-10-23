# 审批工作流交互原型

P1 独立模拟原型已完成，模型测试9项及浏览器核心路径通过；正式业务代码未改变。所有页面和模拟逻辑位于本目录，单向引用项目现有公共UI。原型不是Flowable集成服务，没有部署引擎或调用真实业务接口。

- 方案：[审批解决方案](../../docs/design/approval-workflow/solution.md)
- 规格：[037审批原型](../../.specify/specs/037-approval-workflow-prototype/spec.md)
- 目录规则：[统一原型工作区](../README.md)

## 启动与关闭

在项目依赖已安装的前提下，从仓库根目录执行：

```bash
bash prototypes/approval-workflow/start.sh
bash prototypes/approval-workflow/stop.sh
```

浏览器打开 <http://127.0.0.1:5174>。独立5174端口，不代理API、不占用正式应用5173/3000。端口冲突会报错，不会终止其他服务。关闭脚本只终止PID及命令行均匹配此原型的进程。

需要前台调试时，在本目录执行：

```bash
../../packages/web/node_modules/.bin/vite --config vite.config.mjs
```

构建和模型验证（仓库根目录）：

```bash
packages/web/node_modules/.bin/vite build --config prototypes/approval-workflow/vite.config.mjs
node --test prototypes/approval-workflow/tests/model.test.mjs
```

浏览器验收：先启动原型，设置 `PLAYWRIGHT_MODULE` 为可用Playwright模块路径，再运行 `node prototypes/approval-workflow/tests/browser.mjs`。脚本使用独立无头Chrome上下文，不修改用户浏览器状态；截图输出到 `.runtime/`。当前机器可使用Codex缓存的Playwright运行库。

## 演示路径

默认陈经理身份，点击申请单号进入详情。右上角可切换演示身份，导航和可操作按钮随身份改变。

| 身份 / 场景 | 演示方式 |
|---|---|
| 陈经理 · 金额分支 | 8万元报销无二级负责人；12万元报销需要二级部门负责人。同意后切换对应人员继续 |
| 赵HR · 请假 | 我的待办打开3天调休申请，确认已按部门HR职责分配 |
| 李会计 / 吴法务 · 并行 | 非标报价同时等待财务与法务；一方通过不会结束，双方完成后继续 |
| 李会计 · 转交 | 报销/付款到财务时可转交孙会计；原承办人变只读，孙会计收到待办 |
| 任一当前承办人 · 抄送 | 选择收件人，抄送我的列表和消息联动，抄送不赋予审批权 |
| 陈经理 → 周然 · 退回重提 | 填原因退回，切换周然打开我发起的，修改说明和金额后重提；新轮次关联旧历史 |
| 流程管理员 · 失败重试 | 运行监控查询“交付异常”，打开事件，核查并重试；成功后切换陈经理完成复盘 |
| 流程管理员 → 周然 · 配置发布 | 流程设置编辑阈值/审批人，校验、模拟、保存或发布；周然新建申请使用新版本，旧申请保留原版本 |

管理员能查看所有模拟实例，但不能以管理员身份代替业务人员同意审批。每项申请展示主表、必要明细、图、节点详情、时间轴和本轮状态；已处理页不显示可执行审批按钮。

## 本地存储及恢复

- 模拟数据键：`forge.prototype.approval.v1`，在浏览器localStorage。
- 模拟身份保存在sessionStorage；个人视图按身份+列表对象分开保存。
- 顶部“恢复演示数据”按钮恢复28条初始示例、流程版本、通知；个人视图保留。需要完全清空时只删除以 `forge.prototype.approval.` 开头的键，勿清除整个正式应用存储。
- 本原型没有账号登录或真实鉴权。身份切换只用于演示，不代表生产权限实现。

## 实现边界

已提供：六种模板、金额条件、人员属性、模拟与发布、版本快照、发起申请、待办/已办/发起/抄送、分页查询、个人视图列设置、站内消息、图节点查看、缩放、定位、同意、退回、拒绝、转交、抄送、失败重试。

原型简化：固定申请组织；审批人直接映射模拟人员；模板结构固定，不支持任意拖拽增删节点；只有一组本地个人视图；日期/单号为演示用途，不使用正式编码接口；无附件上传、真实节点字段写回、委托、加签、任意回跳或真实补偿。未提供的操作不伪装成可用按钮。页面提示明确模拟业务执行，不产生付款、库存流水或真实订单关闭。

复用：DetailWorkspace/DetailHeader/DetailTabs/DetailPanel/DetailSection、DocumentWorkspace、RecordQueryBar、ListViewSelector、BusinessDataGrid及RouteTabs/useRouteTabs。新增FlowDiagram、模拟状态机仅在原型目录，尚未作为正式公共组件发布。

## 文件职责

- `src/model.mjs`：纯模拟状态、分支、版本与审批动作，可用Node验证。
- `src/App.jsx`：列表、设置、发起、执行、通知及身份切换。
- `src/components.jsx`：原型列表包装、流程图、原生弹窗及公共组件引用。
- `src/styles.css`：原型外壳与局部布局；宿主变量适配不修改正式样式。
- `tests/`：模型与浏览器验收。
- `vite.config.mjs`：独立入口、复用依赖、无业务API代理。

验证证据与当前状态见[评审记录](../../.specify/specs/037-approval-workflow-prototype/review.md)。正式服务实现需另按方案P2起建立切片，不直接复制mock为真实引擎。

## 主框架嵌入预览

启动主项目开发服务（5173）和本原型（5174）后，在主框架首页按钮旁点击“审批中心”。无需真实登录的既有本机演示入口为 <http://localhost:5173/?preview=workbench#/showcase/approval-center>。该入口仅开发环境及本机有效，身份和数据为模拟，不代表正式授权。宿主不向原型传递账号或令牌；只通过来源与窗口校验的消息同步路由、标题、模拟数量和未保存状态。原型服务不可用时可重试。

原型页面仍在本目录；正式源码只包含隔离预览承载层，不导入模拟业务。原单据演示页最底部新增工作流区域；完整定义分支布局留待正式设计器实现。主框架验证：`node prototypes/approval-workflow/tests/shell-browser.mjs`。
