# BOM 追溯

| 需求 | 验收 | 用例 | 实现 |
| --- | --- | --- | --- |
| BOM-REQ-01 | BOM-AC-01 | BOM-TC-01 | `schema.prisma`、`bom.service.ts` |
| BOM-REQ-02 | BOM-AC-01 | BOM-TC-01 | `BomPage.tsx`、`BusinessDirectory.tsx` |
| BOM-REQ-03 | BOM-AC-02 | BOM-TC-02 | `bom.service.ts`、`BomPage.tsx` |
| BOM-REQ-04 | BOM-AC-03/05 | BOM-TC-03/05 | `bom.service.ts`、数据库唯一索引 |
| BOM-REQ-05 | BOM-AC-04 | BOM-TC-04 | `BomPage.tsx`、`bom.service.ts` |
| BOM-NFR-01 | BOM-AC-01 | BOM-TC-06 | `bom.controller.ts`、`authorization.service.ts` |
| BOM-NFR-02 | BOM-AC-02 | BOM-TC-02 | `scm_bom*` 独立模型 |
| BOM-DEMO-01 | BOM-AC-06 | BOM-TC-08/09/10 | `seed-screen-boms.ts`、`verify-screen-boms.ts` |
