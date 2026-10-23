# DocumentWorkspace 单据容器独立接入

CMP-10 提供统一返回、标题、只读摘要和正文容器。实际调用见 `packages/web/src/showcase/InboundOrderDetailPage.tsx`；本例为合成领用单，不连接该页面或 CRM 服务，不代表新业务功能或独立业务项目采用。

## 复制与运行

从仓库根运行：

```sh
node _methodology/scripts/inspect-component-dependencies.mjs CMP-10
node _methodology/scripts/rehearse-query-bar.mjs --component CMP-10 --clean-install
```

输出新临时工程，保留导出的相对目录、manifest、锁文件和日志。依赖闭包包含 DocumentWorkspace、DetailWorkspace 及两份 CSS，需要 React、ReactDOM 和 Tabler。不要只复制 DocumentWorkspace.tsx，亦不要把空 unresolved 当作无依赖。main.tsx 中的本地入口由脚本生成。

成功构建后，在该临时工程执行 `./node_modules/.bin/vite preview --host 127.0.0.1 --port 5197 --strictPort`，从仓库根执行 `node _methodology/scripts/verify-document-workspace-adoption.mjs http://127.0.0.1:5197/`。使用现有 Chrome / Playwright，可设置 PLAYWRIGHT_MODULE_PATH；运行后关闭预览服务。

## 责任边界

| 内容 | 容器负责 | 宿主负责 |
|---|---|---|
| 布局 | 返回箭头、标题/摘要、主表上方和明细下方的单一正文区域 | 具体字段和表格、查询及路由 |
| 编辑态 | 接收 actions 和 children | 编辑/保存/取消按钮、可写状态、操作列及新增行显隐 |
| 数据 | 不保存也不汇总 | 独立草稿、取消恢复、校验、提交失败及并发冲突 |
| 权限与状态 | 不含审批状态机或权限检查 | 服务端鉴权、状态流转和库存过账，不用前端禁用替代 |
| 窄屏 | 正文缩进与字段布局样式 | 为宽明细表提供局部横向滚动；禁止整页裁切 |

这里的“保存”仅保存页面内存，刷新会丢失；状态选择器仅为测试夹具，不是业务审批操作。合成数量为正整数，不能用此输入处理替代真实数量精度、金额计算或空单校验。返回回调不含未保存保护，宿主需另行实现。页面不使用多 Tab，单据明细编辑规则来自宿主，不向公共容器加入业务状态枚举。

CSS 仍含 enterprise-page、document-fields 等全局选择器，需要审查命名冲突；host.css 只展示必要布局，不是可整包覆盖目标项目的主题。接入前填写[采用记录](../../templates/ui/adoption-record-template.md)，参考[接入指南](../../components/quickstart.md)。本资产保持候选。

## 实际验证（2026-10-03）

[dist-preview-verification.json](dist-preview-verification.json) 保存实际源码/脚本、依赖及构建产物哈希。npm 独立安装 22.1 秒、类型检查 2.0 秒、构建 131.8 秒，均退出 0。使用现有 Chrome/Playwright 访问构建产物预览，在 1440×1000 桌面和 390×844 触控下验证：无 Tab、浏览只读且无新增/操作列、取消恢复原备注与明细、编辑数量/新增/删除、内存保存、已提交和已审核禁用编辑、返回回调、页面不横向溢出与窄屏明细局部滚动。pageerror 列表为空。

首轮脚本在嵌套 label 下的 select 精确名称定位超时，改为 combobox 角色及名称前缀后，对同一 dist 完整重跑通过；没有把首轮失败抹去或当作业务缺陷修复。触控截图已查看；删除右侧行按钮后表格保留横向滚动位置，截图中显示数量列，其他列仍可通过表格自身滚动访问。临时预览已关闭。

当前源码核对：`node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/document-workspace-adoption/dist-preview-verification.json`。MATCH 不证明当前环境已重跑，更不证明权限/库存正确。此次扩展公共演练脚本，包含该脚本的其他组件历史记录可能显示 STALE；保留旧记录，按变化范围决定重验，不能直接刷新旧哈希。
