# 纯 CSV 工具独立接入

适用于已确定字段与行数据的 CSV 文件编码，不是业务查询、权限校验或 Excel 工作簿工具。源码为 `packages/web/src/common/data-grid/csv-export.ts`，单文件、无 imports、无第三方运行依赖。与组件目录的 CMP 编号分开管理：它是辅助函数，不创建一个没有页面意义的组件条目。

## 复制方式

将 csv-export.ts 复制到目标项目自己的公共导出目录：

```ts
import { createCsvBlob } from './csv-export';
const blob = createCsvBlob([
  ['名称', '数量'],
  ['示例耗材', '8.0000'],
]);
```

目标环境须有标准 Blob；TypeScript 配置包含 DOM 类型或等价的目标环境类型。无需复制 grid-export.ts、React、AG Grid、ExcelJS 或项目契约包。原工程 grid-export.ts 继续再导出 csvCell/createCsvBlob，以保持既有调用兼容；需要分页工具或 XLSX 的调用仍走原模块，不能把它们也称作已脱离 ExcelJS。

金额、数量、日期和空值展示由调用方先确定，工具把输入转成文本；对象需要先取显示值，不依赖默认 String(object) 作为业务格式。输出 UTF-8 BOM、字段双引号及 CRLF 行分隔，保留字段内换行。当前沿用 =、+、-、@、Tab、CR 开头文本添加单引号的策略，不保证所有导入软件及公式变体的安全性。数据取齐、快照、授权列、文件名、浏览器下载和 URL 释放仍由宿主负责。

## 实际验证（2026-10-03）

从仓库根运行 `node _methodology/scripts/rehearse-csv-export.mjs`。脚本创建新临时工程，只复制该源码，以 types=[]、ES2022/DOM 编译，复用源工程已有 TypeScript 编译器；临时工程不安装或链接 node_modules。用 Node 原生 Blob 检查输出类型、BOM、完整预期文本字节、引用/逗号/换行、控制字符前缀、空值与输入不变性。

本次命令通过，证据见 [standalone-result.json](standalone-result.json)。另运行库存与 grid-export 两文件，16 项通过（7.60 秒），验证原入口兼容、XLSX 及分页失败行为未回归。没有浏览器下载、电子表格应用导入、超大文件性能或完整安全审计；单文件可复制不等于目标项目已完成采用。

证据源码核对：`node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/csv-export-adoption/standalone-result.json`。此辅助函数证据不属于组件演练清单扫描的 `*verification.json`，需从本说明查阅。MATCH 不重新执行编译或运行。
