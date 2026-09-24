# UI 接入兼容性整改证据

来源：`REQSRC-040`，承接 `REQSRC-039` 的六项接入障碍。范围为用户授权的本地源码接入整改与合成数据演练。切片 011 仍等待 Specification Gate；本次不改写历史 Gate 或资产成熟度。

## 变更与验收对应

| 工作项 | 实际变更 | 验收与边界 |
|---|---|---|
| ADOPT-01 | 导航支持菜单、标题、选中项、选择事件、内容插槽；列表支持数据、列与详情扩展 | 控制导航与数据刷新有独立测试；仍保留 DemoRecord 基础字段，不是任意 Schema 列表引擎 |
| ADOPT-02 | 新增 scoped adoption.css，独立定义样式及令牌默认值 | 演练不导入 Lab 全局 CSS；覆盖三档屏宽，仅对该组合证明视觉可用 |
| ADOPT-03 | presentation 注入保存标签、说明、错误及成功文案 | 原默认值兼容旧 Demo；新示范明确会话内保存 |
| ADOPT-04 | BOM 行为测试与门户登记测试拆分 | 行为测试进入隔离运行，登记测试仍在 Lab 执行 |
| ADOPT-05 | 生成独立 package.json/tsconfig，增加 clean-install 模式与安装日志 | 新目录 npm install、tsc、Vite、Vitest 全通过；生成 package-lock 留在输出目录，不是共享包发布 |
| ADOPT-06 | ResourceWorkspace 调用既有导航、列表、主从模板串联同一资源 | 编辑→保存→详情→列表反映修改；失败与取消保留原对象；合成数据刷新重置 |

## 自动验证

- 干净安装输出目录：`/var/folders/38/70f3qb9d057gtjfmjjkfnxyw0000gn/T/forge-ui-adoption-SOf89A`。
- `npm install --ignore-scripts --no-audit --no-fund`：PASS。
- 独立 `tsc --noEmit`、`vite build`：PASS。
- 独立 `vitest run`：16 文件 / 87 测试 PASS。
- Lab `pnpm verify` 已在兼容改造后通过；后续增加的导航/列表配置测试随最终全仓验证再次检查。
- 最终窄屏样式修正后的离线演练目录：`/var/folders/38/70f3qb9d057gtjfmjjkfnxyw0000gn/T/forge-ui-adoption-6mHiRe`。
- 最终 `verify-all.sh`：PASS，包含新增配置测试与原有门户回归；保留既有包体积警告与条件跳过的数据库测试。
- 归档证据：[运行结果](evidence/ui-adoption-20260918/result.json)、[测试日志](evidence/ui-adoption-20260918/vitest.log)、[安装日志](evidence/ui-adoption-20260918/install.log)。

## 浏览器核对

在独立本地服务中检查资源列表→详情→编辑，修改名称并保存、返回详情；成功反馈披露会话内保存。1440px、1024px 页面保持可操作；390px 页面宽度实测 390px，明细表按 600px 内容宽度在局部横向滚动。
发现并修复：窄屏表头换行挤压、固定行操作遮挡左侧内容、资源改名后页签仍旧名。关键失败与放弃行为由集成测试覆盖；本次未声明全键盘审计、屏幕阅读器审计或所有模板跨项目验收完成。

最终截图：[1440px](evidence/ui-adoption-20260918/editor-1440.png)、[1024px](evidence/ui-adoption-20260918/editor-1024.png)、[390px](evidence/ui-adoption-20260918/editor-390.png)。浏览器 page errors 为空；窄屏表格左右滚动，不再固定右侧操作遮挡数据。

## 复用与交付决定

本阶段采用“源码模板＋行为测试＋接入示范”交付。菜单、数据、场景、文案和样式均有明确入口；保留相对目录即可演练。暂不增加独立 npm 包维护成本。

可复用：受控状态、错误保留、稳定对象/行身份、配置注入、局部样式和隔离测试方法。
不可直接复用：合成资源字段、会话内保存、固定 DemoRecord 基础字段、销售和 BOM 样本规则。生产分页、权限、事务和并发由目标项目负责。

回退方式：保留原场景默认 props 与原组件测试；撤回新增的 adoption 调用即可恢复原门户行为。若撤回配置扩展，须同时撤回 ResourceWorkspace 及对应测试；不要删除历史批准来源或重置用户其他工作。
