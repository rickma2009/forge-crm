# 参考证据与复用台账

> 原则：参考项目是证据，不是答案。源码和测试优先于截图；外部案例必须记录来源与适用边界。

| 编号 | 来源 | 材料明确事实 | 实现支持的推断 | 可保留内容 | 必须排除 | 验证状态 |
|---|---|---|---|---|---|---|
| `REF-001` | `_methodology/08-企业管理系统交互模式分类方法.md` | 已定义页面、操作、展示、状态、特殊操作和组合场景分类 | 可作为 Demo 目录的初始信息架构 | 分类语言、编号、候选生命周期 | 把全部候选视为已验证 | 方法论候选 |
| `REF-002` | `_methodology/patterns/enterprise-two-level-navigation-shell.md` | 已记录结构、不变量、令牌和验收 | 适合作为左侧分类导航的首个参考 | 去业务化壳层、令牌和验收 | MCRM 角色、菜单和组织规则 | `interaction-verified` |
| `REF-003` | `_methodology/examples/002-golden-interaction-enterprise-navigation-shell/` | 有无需构建的交互案例 | 可以接入统一预览容器 | 展开、搜索、折叠、移动抽屉交互 | 宣称真实权限已接通 | 案例检查通过 |
| `REF-004` | `_methodology/patterns/record-management-workspace.md` | 已记录列表、新增、详情骨架和边界 | 适合作为右侧 Table 工作区首个案例 | 查询、页签、字段分组、状态原则 | 客户业务字段和具体表格库依赖 | `implementation-verified` |
| `REF-005` | `_methodology/examples/003-golden-interaction-record-management-workspace/` | 有列表—新增—详情交互案例 | 可以验证统一案例契约 | 页面切换、查询、重置和页签 | 认为完整 CRUD 均已实现 | 案例检查通过 |
| `REF-006` | `mcrm/packages/web/src/` 与 `App.spec.tsx` | 实际项目存在导航、客户列表、新增、详情和测试 | 方法论案例已在一个项目落地 | 交互不变量与验证清单 | MCRM 业务字段、权限角色、技术选型 | 项目验证证据 |
| `REF-007` | Open Design 具体案例 | 尚未提供具体链接或项目 | 可能用于原型构图、交互和设计系统参考 | 待逐项评审 | “优秀”直接等于通用最佳实践 | 未收集 |
| `REF-008` | 用户已完成系统 | 尚未提供源码、URL 或截图 | 可能包含新的页面或特殊操作模式 | 源码支持的不变量和去业务化资产 | 敏感数据、组织约束、遗留实现 | 未收集 |

## 后续导入规则

1. 用户提供源码时优先读取路由、样式、配置和测试；
2. 只有 URL 时记录版本、访问时间和可见范围；
3. 截图只补充视觉核对，不推断隐藏状态和权限；
4. Open Design 生成物记录具体 Brief、项目和验证结果，不把生成成功等同于模式验证；
5. 所有新材料先进入 `.specify/sources/`，再更新本台账。
