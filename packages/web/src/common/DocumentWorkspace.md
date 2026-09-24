# 单据详情接入
规范：UI-DOCUMENT-01 / UI-BACK-01。组件负责呈现，不访问API、不推断业务状态。

```tsx
<DocumentWorkspace title={document.orderNo} status={statusTag} fields={summary}
  backLabel="返回单据列表" onBack={guardedBack}
  actions={editing
    ? <button type="submit" form={formId} disabled={saving}>保存</button>
    : canEdit && <button onClick={startEdit}>编辑</button>}>
  <form id={formId} onSubmit={save}>
    <DetailSection title="单据信息">
      <fieldset className="form-grid document-fields">{/* 标签在上；控件根据字段权限锁定 */}</fieldset>
    </DetailSection>
    <DetailSection title="单据明细" actions={editing && addLineButton}>
      <div className="enterprise-table-wrap"><table className="document-grid">{/* 仅编辑态渲染操作列 */}</table></div>
    </DetailSection>
  </form>
</DocumentWorkspace>
```

canEdit必须同时检查权限与当前业务状态；明细字段只读与操作列显示使用同一editing条件。永久只读字段不能随editing解锁。调用方负责版本、加载、失败保留、取消恢复、离开保护、权限失效和业务状态操作，禁止组件擅自新增权限/API。默认无Tab；特殊单据必须登记例外。

`DetailBackButton`提供label/onBack/disabled，客户详情同款32px按钮和16px图标；DocumentWorkspace内置的DetailHeader自动复用。
参考实现：InboundOrderDetailPage.tsx；验证：InboundOrderDetailPage.test.tsx、scripts/document-detail-browser-qa.mjs。
