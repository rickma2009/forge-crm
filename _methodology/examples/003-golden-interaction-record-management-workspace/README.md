# 金标准交互案例：记录管理工作区

无需构建的列表—新增—详情与工作区页签案例，不包含真实接口或权限。

分类映射：`EPM-PAGE-010` 查询列表页、`EPM-PAGE-011` 对象详情页、`EPM-PAGE-012` 新建/编辑页；当前案例只验证基础查询、页签和页面切换，不代表完整记录生命周期均已验证。分类定义见 `../../08-企业管理系统交互模式分类方法.md`。

```bash
python3 -m http.server 4174 --directory _methodology
```

打开 `http://127.0.0.1:4174/examples/003-golden-interaction-record-management-workspace/`，验证查询/重置、新增页签、详情页签、返回列表和关闭页签。
