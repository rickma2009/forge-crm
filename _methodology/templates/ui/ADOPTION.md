# 企业 UI 资产采用入口

本页是选择和接入索引，不另建成熟度登记册。权威成熟度仍读取 [资产登记册](../../patterns/index.json)；Lab Release 只证明验证场内交付。

## 按任务选择

| 需要完成的任务 | 规范与契约入口 | 代码位置（仓库根目录起） | 交付方式与当前限制 |
|---|---|---|---|
| 开始一个工程 | [工程 Profile](../../profiles/typescript-enterprise-web/technology-profile.md) | `_methodology/scripts/forge.mjs` | 可生成最小工程；企业功能需另行接入 |
| 统一颜色、字号、间距、焦点 | [主从令牌](master-detail-document/master-detail-document.tokens.css) | `interaction-pattern-lab/packages/web/src/ui-assets/adoption/adoption.css` | 独立演练样式入口，以 `.adoption-app` 隔离并允许覆盖 `--adopt-*`；不代表完整设计系统 |
| 双层导航与搜索折叠 | [导航模板](enterprise-navigation-shell/README.md) | `interaction-pattern-lab/packages/web/src/demos/navigation-shell/` | 源码示例；支持 groups/title/activeId/onSelect/children/showOverview，默认保留原案例 |
| 列表、查询、新增、详情 | [记录工作区](record-management-workspace/README.md) | `interaction-pattern-lab/packages/web/src/demos/record-workspace/` | 支持 records/columns/renderDetail/allowCreate；仍要求 DemoRecord 基础字段，默认新建不保存 |
| 待办、提醒、主从工作区 | [工作台模板](enterprise-workbench/README.md) | `interaction-pattern-lab/packages/web/src/showcase/EnterpriseWorkbenchPrototype.tsx` | 候选示例；没有独立接入证明 |
| 表头＋可编辑明细 | [主从模板](master-detail-document/README.md) | `interaction-pattern-lab/packages/web/src/ui-assets/templates/master-detail-document/` | 场景与 presentation 文案可注入；省略 presentation 时保持历史模拟提示 |
| 字段与条件规则 | [字段示例](master-detail-document/schema-form.schema.example.json) | `interaction-pattern-lab/packages/web/src/ui-assets/components/schema-form/`、`primitives/` | 受控源码组件；需一起带入类型与规则 |
| 新增、复制、删除、撤销明细 | [行表契约](master-detail-document/editable-line-grid.schema.example.json) | `interaction-pattern-lab/packages/web/src/ui-assets/components/editable-line-grid/` | 受控源码组件；目标项目提供行身份、字段及权限 |
| 错误定位、异步结果 | [状态矩阵](master-detail-document/state-matrix.md) | `interaction-pattern-lab/packages/web/src/ui-assets/components/validation-summary/`、`async-state/` | 可组合源码组件；需适配业务错误分类 |

字典、可配置列表视图、数据库导航已有 Lab 实现，但目前作为参考切片评估，不承诺可独立安装。导入操作切片 011 仍为规格草案。

## 最小组合与接入步骤

首轮组合为样式、导航、列表详情、主从单据。开发示范与生产模板分别验收。

1. 在目标项目记录采用版本及 `adopt / adapt / reject`，使用 [采用记录模板](adoption-record-template.md)。
2. 通过导航和列表 props 提供菜单、选中项、数据与列渲染。详情扩展由 renderDetail 提供；自定义业务字段可在调用者中按 id 关联。
3. 主从部分保留 `components`、`primitives`、`templates` 的相对目录；只把 `scenarios` 当配置参考。
4. 替换对象头、明细、候选加载、校验、保存和离开行为；确认只读、禁用、保存中与失败恢复。
5. 先运行隔离演练，再验证目标项目的样式、真实接口、权限与浏览器交互。
6. 保存版本、改动、测试和回退记录。工程可移植性验证不等同于独立业务采用。

## 可重复的隔离演练

在已安装 Lab 依赖的仓库根运行：

```bash
node _methodology/scripts/rehearse-ui-adoption.mjs
# 需要联网；不链接 Lab node_modules，生成 package-lock.json：
node _methodology/scripts/rehearse-ui-adoption.mjs --clean-install
```

脚本只创建随机临时目录，复制指定源码并生成资源列表→详情→主从编辑→返回的组合页，执行类型检查、构建和测试。输出目录包含制品、日志与 result.json；不覆盖任何目标项目。在输出目录执行 `npm run dev -- --port 5186` 可启动本地演示，clean-install 生成的工程可用 `npm ci --ignore-scripts` 重装。

默认模式复用本机依赖；clean-install 模式已完成一次干净安装、类型检查、构建及 87 项测试。演练使用独立 adoption.css；BOM 行为测试已与门户登记测试分离，随源码参加隔离测试。资源示范在浏览器完成主路径及响应式核对；不据此声明全部旧模板视觉可移植或跨版本兼容。

## 最小组合的实际入口

`interaction-pattern-lab/packages/web/src/ui-assets/adoption/ResourceWorkspace.tsx` 是接入示范：调用者维护资源集合，模板只通过注入的 save 回写；失败保留输入，放弃变更保留原对象，切换对象通过 key 重建编辑状态。该示范的新建入口明确关闭，避免显示未实现保存的按钮。

当前选择源码模板交付，暂不独立发包。列表基础类型、分页、服务端查询、权限、事务、并发与审计仍是目标项目适配项。

## 交付选择

- 规则和验收：引用文档，目标项目记录差异。
- 页面和场景：优先源码模板，便于业务调整。
- 稳定组件：先证明隔离接入，再评估独立包；当前不发布包。
- Demo Adapter：保留为测试夹具，真实保存需要目标项目自己的实现。

评估不能只数文件。核心指标是目标页面能否运行、需要修改几处、有哪些隐含依赖、失败行为是否保留；耗时和收益仅记录真实观测。
