# 弹窗表单错误归属与提交约定

## 公共实现

`packages/web/src/showcase/useDialogSubmit.tsx` 提供两个职责分离的公共能力：

- `useDialogSubmit`：弹窗实例自己的错误和保存状态，同步锁避免重复请求，捕获同步校验异常与异步保存异常，重试清除旧错误，卸载后不回写旧错误。
- `DialogSubmitError`：在弹窗正文内呈现 `role="alert"`，错误出现时聚焦提示，避免长表单中看不到错误。

这不是全局 HTTP 错误拦截器：请求层不知道操作来自页面还是弹窗，不能替界面选择错误位置。页面保留列表加载、刷新、页面级操作错误；弹窗负责由自身发起的校验与提交错误。已正确实现局部错误的客户/联系人、字典、角色编辑等不必仅为统一形式重写。

## 接入

```tsx
const { error, saving, submit } = useDialogSubmit();
// 放在弹窗 form 内；operation 中先校验，再等待 API 保存。
<form onSubmit={event => {
  event.preventDefault();
  void submit(async () => {
    const input = validateDraft();
    await onSave(input);
  });
}}>
  <DialogSubmitError error={error} />
  {/* 业务字段由调用方维护，失败后不清空、不关闭 */}
  <button disabled={saving}>保存</button>
</form>
```

父组件 `onSave` 不得 catch 后只写父页面错误，也不得将失败转换成已完成的 Promise。保存失败继续 reject；确认保存成功才关闭。保存已成功、仅列表刷新失败时，应提示“已保存，刷新失败”，不得引导再次创建。

输入校验优先复用 contracts；业务规则不能放入公共 Hook。若用 `noValidate` 统一在弹窗提示，必须覆盖必填、长度、数值、日期和跨字段约束。服务端校验与 RBAC 始终保留，前端校验不能替代它们。

## 本次组织保存问题

- 可重复证据：旧组织编码 HTML pattern `[a-z][a-z0-9.-]*` 在现代浏览器采用的 `v` 模式编译时报错，不能可靠阻止不合法编码；例如 `HR_01` 不符合已有服务端契约。
- 原组织表单没有调用写入契约校验；后端将 Zod 校验异常归并为“请求参数无效”，父页面又捕获保存异常，使提示落在弹窗背后。
- 修复：转义 HTML pattern 中的连字符，显示编码规则；提交前运行共享组织契约并输出字段级中文提示；用公共提交边界展示服务端错误。保留已有编码规则，不自动转换或放宽编码。
- 顺带修正本地“今天”先转 UTC 再截日期可能显示前一天的问题。
- 未获得用户当时失败请求的具体内容，因此不能断言 `HR_01` 就是用户实际输入；它是已复现的同类路径。

## 适用边界与验收

适用于单实例异步提交表单。页面查询错误、已关闭弹窗后的刷新错误、跨步骤工作流，不直接套用弹窗错误归属。Hook 不决定业务规则、授权、重试幂等性或数据库事务。

- 失败提示必须在对应 `dialog` 内，不被遮罩遮挡；输入不丢失，弹窗不关闭。
- 修正输入后可再次保存，旧错误清除，保存期间不重复提交。
- 合法保存成功才关闭并刷新；关闭重开不得继承上次错误。
- 组织编码、空白名称、无效日期及有效期冲突在请求前校验；后端仍独立校验。
- 组织、员工、资源菜单、兼容角色新建已接入；资源按钮/页签/挂载通过 `SimpleEditor` 复用。
- 回归：`OrganizationUnitsPage.test.tsx`、`EmployeeDirectoryPage.test.tsx`、`ResourceMenuPage.test.tsx`、`useDialogSubmit.test.tsx`。

本次属于现有功能缺陷修复，不修改数据模型、权限或 Gate 状态，不构成资产晋升或 Release 批准。公共实现是本工程复用能力，尚未证明跨项目适用性。

## 本次验证（2026-09-23）

- 修复前：组织页面测试 5 失败 / 2 通过，复现 HTML pattern 编译错误、缺失弹窗错误及缺失提交前校验；修复后该组 7/7 通过。
- 相关 5 个测试文件 20/20 通过；全量 Web 测试 38 文件、184/184 通过。
- `pnpm --filter @interaction-pattern-lab/web exec vite build` 通过，保留既有大包体积提示。
- 全项目 typecheck 未通过：`ShowcaseApp.tsx` 中 product-directory、competitor-directory、opportunity-stage-admin 分支与 renderer 类型不一致；属于此次未修改的商机相关增量，未覆盖修改。
- 浏览器：工具连接返回 `nodeRepl.fetch request failed`；使用已有 Playwright + 本机 Chrome，无新增浏览器依赖。目标 `http://localhost:5173/#/showcase/system/organization`，1440×1000。
- 实际渲染验证：非法编码阻止请求 → 模拟接口拒绝在 dialog 内提示 → 保留输入 → 再次保存成功关闭；页面标题正确、内容非空、无 Vite 错误覆盖层、无 pageerror。
- 浏览器 POST 使用拦截响应，不写入组织数据库；成功提示不能作为真实数据库写入验收。截图保存在 `/private/tmp/sdd-organization-dialog-error.png`（临时证据，不随仓库长期保存）。未覆盖移动端和用户当时原始失败请求。
