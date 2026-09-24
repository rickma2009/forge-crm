# 测试用例

| ID | 覆盖 | 预期 |
|---|---|---|
| `TC-1301` | `AC-1301` Contract 解析含动态 depth 的父子响应 | 父 0、子 1 |
| `TC-1302` | `AC-1304` 失效时间不晚于生效时间 | Contract 拒绝 |
| `TC-1303` | `AC-1301` 无序组织行构建树 | 父先于子，同级按排序和编码稳定排列 |
| `TC-1304` | `AC-1304` 根组织移动到后代下 | 循环判断拒绝 |
| `TC-1305` | `AC-1302` 页面收起/展开父级 | 后代隐藏/恢复 |
| `TC-1306` | `AC-1303` 点击新增下级 | 弹窗默认选择父级 |
| `TC-1307` | `AC-1305` 用户页查询后重置 | 最新请求无 keyword |
| `TC-1308` | `AC-1301`、`AC-1303`、`AC-1304` Prisma migration 与 Seed | `org_unit` 约束、菜单和权限数据存在 |

## UIAUDIT-20260923 增量验收

REQ-STYLE-07 的 AC/TC 统一见 `.specify/requirements/global-page-style/testcases.md`。本切片需验证：组织节点右键与右侧省略号复用同一公共菜单，提供新建同级、子组织、编辑。没有删除接口，不增加删除能力；只读用户不显示菜单。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
