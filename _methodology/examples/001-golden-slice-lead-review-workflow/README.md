# 金标准纵向切片：线索评审工作流

这是工作流类功能的金标准案例，与任何实际项目无关。

```text
active → in_review → qualified
                   ↘ rejected
```

它演示状态机、非法迁移拒绝、审计历史及 `REQ → AC → TC → TASK → Evidence` 闭环。

```bash
node --test implementation/lead-review-workflow.test.mjs
bash ../../scripts/check-sdd.sh .
```

`example-approved` 只代表教学案例完整，不代表真实业务批准。

本案例使用工作台级 `sdd-forge-workflow`，不在案例目录复制 Skill；这也是新项目的默认模式。
