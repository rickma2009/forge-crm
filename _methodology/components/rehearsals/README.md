# 独立接入演练配置

每个已实现演练使用一份 `CMP-xx.json`，由 `rehearsal-recipe.mjs` 读取。新增组件的演练通常只增加该配置及 examples 下的夹具，不修改公共 runner。仅当生成/安装/构建流程变化时修改公共工具，并接受其影响所有使用者的证据。

| 字段 | 含义 |
|---|---|
| fixture | examples 下的单层目录名，必须包含 main.tsx 和 host.css |
| symbol | 生成的本地再导出文件名，也是未指定 exports 时的导出名称 |
| title | 合成宿主标题，不接受 HTML 标签 |
| entry | 可选，common 下的无扩展名相对入口；默认 symbol |
| exports | 可选，非空且不重复的具名导出列表；不能包含可执行语句 |
| dependencies | 可选，非空依赖包名列表；从 web/package.json 读取版本，未登记的依赖报错；默认 React、ReactDOM、Tabler |

保留现有 `node _methodology/scripts/rehearse-query-bar.mjs --component CMP-xx --clean-install` 入口。未知编号、非法路径、未知字段等配置错误拒绝执行，不允许在 JSON 中写任意安装命令或 shell 钩子。配置由仓库维护者评审，不能当作外部不可信插件沙箱。

新 result.json 自动记录所选配置、runner、配置读取器、导出器、依赖分析器、web/package.json，以及原有组件/夹具的哈希。不会记录其他组件的配置，避免新增不相关夹具造成全部记录变化。浏览器脚本、结果、产物及真实业务证据仍需另行记录；source MATCH 只验证记录列出的文件。

迁移后的公共 runner 本身发生变化，所以旧记录显示 STALE 是正确结果，不回填历史哈希。以后新增配置不会修改已有配置，但共享工具/依赖声明变化仍应复审。这是减少无关变化，不是绕过真实依赖变化。

维护验证：`node --test _methodology/scripts/rehearsal-recipe.test.mjs`，覆盖其他配置变化不影响已选记录、已选配置变化影响哈希、非法输入拒绝，并自动扫描目录中的全部 JSON 检查夹具存在。选择实际演练做生成/类型/构建验证；未运行浏览器时不得宣称交互已复验。
