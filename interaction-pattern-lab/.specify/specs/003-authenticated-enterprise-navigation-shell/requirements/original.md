# 切片 003 已批准业务输入

> 状态：Business Gate 已批准
> 批准来源：`REQSRC-014`

## 权威输入

- `REQSRC-013`：多来源 UI 萃取、导航菜单首片请求与视觉截图；
- `REQSRC-014`：范围 003 的 Business Gate 批准；
- `requirements/003-multi-source-ui-distillation-showcase/requirement.md`：`BUS-005`—`BUS-008`、`REQ-301`—`REQ-321`、`NFR-301`—`NFR-306`；
- `_methodology/reference-cases/ui-distillations/UID-001-enterprise-navigation-shell/`：首个候选的来源选择、证据矩阵、萃取结论、示例菜单和候选令牌。

## 切片输入

本切片只承接以下已批准业务语义：

1. 通用演示门户的深色左侧导航壳层；
2. 品牌区、菜单搜索、上方主菜单、底部系统管理、展开和折叠；
3. `admin` 与 `viewer` 两种确定性模拟身份；
4. 菜单、直接路由、页面只读和页面操作四层权限反例；
5. 来源项目名称仅保留在证据层，运行文案使用中性名称；
6. 桌面 1440px 基准并覆盖至少 1280px；
7. 不连接生产服务，不写真实业务数据。

## 本切片不承接

- 真实账号、密码、服务端鉴权、数据库和审计后台；
- 全部页面模板或 103 个交互 Demo 的实现；
- 通用低代码渲染器、生产组件包或资产晋升；
- `gscrm-sdd` 的页面萃取；
- 切片 002 的 Release 决定。
