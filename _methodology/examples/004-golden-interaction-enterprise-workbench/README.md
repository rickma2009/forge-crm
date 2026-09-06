# 金标准交互案例：企业工作台与主从工作区

无需构建的候选案例，用于验证工作队列选择、详情同步、类型筛选、完成反馈和稍后提醒。它使用内存演示数据，不包含真实任务来源、权限、消息或审批状态机。

分类映射：`EPM-PAGE-002` 工作台、`EPM-VIEW-011` 描述列表、`EPM-VIEW-015` 时间线、`EPM-ACT-001` 搜索、`EPM-ACT-005` 上下文导航、`EPM-ACT-013` 状态动作。当前案例不是项目采用或发布证据。

```bash
python3 -m http.server 4174 --directory _methodology
```

打开 `http://127.0.0.1:4174/examples/004-golden-interaction-enterprise-workbench/`，验证筛选、选择同步、完成、稍后提醒和无结果状态。
