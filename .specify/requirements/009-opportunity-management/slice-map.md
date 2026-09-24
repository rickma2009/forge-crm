# 商机管理交付切片图

| 顺序 | 拟议切片 | 主功能 | 可独立验收结果 | 进入条件 |
|---|---|---|---|---|
| 1 | `017-sales-master-data-foundation` | `FR-OPP-001`—`FR-OPP-003` | 产品、竞争对象可维护；模板/阶段可被 API 读取并幂等初始化 | Business Gate；阶段/赢率决策确认 |
| 2 | `018-opportunity-core-workspace` | `FR-OPP-004`—`FR-OPP-005` | 从商机列表新建并进入详情，维护基本信息和多商品行 | 017 可用；018 Spec/Architecture Gate |
| 3 | `019-opportunity-follow-up` | `FR-OPP-006` | 商机详情记录、编辑和停用跟进记录 | 018 可用；019 Spec/Architecture Gate |
| 4 | `020-opportunity-analysis-history` | `FR-OPP-007` | 每次分析留痕，阶段/把握度原子同步且可复核 | 018 可用；竞争对象可用；020 Gate |
| 5 | `021-opportunity-stage-administration` | `FR-OPP-008` | 管理员维护模板阶段、排序、赢率、默认阶段和状态 | 核心闭环验证后重新评审配置风险 |
| 后续 | 待编号 | 赢丢单、重开、批量转交 | 继承旧基线并按当前权限体系重写规格 | 用户另行批准 P1 范围 |

每个切片依次执行 `spec → testcases → Specification Gate → plan → Architecture Gate → tasks → implement → review → Release Gate`。后续切片不得用前一切片批准记录自动替代自己的 Gate。
