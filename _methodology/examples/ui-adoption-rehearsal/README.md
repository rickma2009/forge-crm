# UI 接入演练示例

本例为工程复用演练，不是新业务切片或正式晋升的金标准。规范入口见 [采用指南](../../templates/ui/ADOPTION.md)。

运行 `node _methodology/scripts/rehearse-ui-adoption.mjs` 生成临时资源应用示范，包含同一对象的列表、详情、主从编辑与返回流程。加 `--clean-install` 可验证独立依赖安装。最初评估见 [评估记录](../../../docs/baselines/2026-09-18-ui-adoption-rehearsal.md)，后续改造见 [整改证据](../../../docs/baselines/2026-09-18-ui-adoption-refactoring.md)。

验证层次：类型检查、独立 Vite 构建、组件及场景测试、一次干净依赖安装、资源示范浏览器核对。真实后端及业务采用尚未验证；没有因此新增 Gate 或提高资产成熟度。
