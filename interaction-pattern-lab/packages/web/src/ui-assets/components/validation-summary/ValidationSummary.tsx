export interface ValidationSummaryItem {
  error: { id: string; fieldId: string; message: string };
  targetId: string;
}

export interface ValidationSummaryProps {
  errors: ValidationSummaryItem[];
}

export function ValidationSummary({ errors }: ValidationSummaryProps) {
  if (errors.length === 0) return null;

  return <section aria-label="校验摘要" role="region">
    <h2>校验摘要</h2>
    <p>发现 {errors.length} 个错误，请逐项修复。</p>
    <ul>
      {errors.map(({ error, targetId }) => <li key={error.id}>
        <button aria-controls={targetId} type="button" onClick={() => activateTarget(targetId)}>{error.message}</button>
      </li>)}
    </ul>
  </section>;
}

function activateTarget(targetId: string) {
  const target = document.getElementById(targetId);
  if (!(target instanceof HTMLElement)) return;

  target.focus();
  if (target instanceof HTMLButtonElement) target.click();
}
