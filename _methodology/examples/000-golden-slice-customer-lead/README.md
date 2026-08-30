# 金标准纵向切片：客户线索登记

这是一个独立于 `mcrm` 和 `gf_scm` 的教学案例，用来验证 SDD 文档链、实现链和证据链。

## 覆盖链路

```text
BUS-001
  → REQ-001/002/003 + NFR-001
  → AC-001..005
  → TC-001..006
  → API-001 + ADR-001
  → TASK-001..004
  → implementation + test evidence
```

## 场景

销售人员登记客户线索。系统校验姓名和邮箱、规范化邮箱、阻止活动线索中的重复邮箱，并允许按 ID 查询刚创建的线索。

## 运行验证

```bash
node --test implementation/customer-lead.test.mjs
bash ../../scripts/check-sdd.sh .
```

这是方法论样例，不代表生产架构，也不替任何真实项目完成四个人工 Gate。

本案例使用工作台级 `sdd-forge-workflow`，不在案例目录复制 Skill；这也是新项目的默认模式。
