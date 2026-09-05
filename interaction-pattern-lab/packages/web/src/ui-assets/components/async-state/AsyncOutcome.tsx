export interface AsyncFailure {
  id: string;
  reason: string;
}

export type AsyncOutcomeValue =
  | { kind: 'success'; message: string; nextStatus?: string }
  | { kind: 'validation-failed'; errors: Array<{ id: string; message: string }> }
  | { kind: 'business-rejected'; reason: string }
  | { kind: 'partial-success'; total: number; succeeded: number; failed: AsyncFailure[]; unprocessed: number };

export interface AsyncOutcomeProps {
  outcome: AsyncOutcomeValue | null;
}

export function AsyncOutcome({ outcome }: AsyncOutcomeProps) {
  if (!outcome) return null;

  if (outcome.kind === 'success') return <section role="status" aria-label="模拟操作结果">
    <p>模拟操作已完成：{outcome.message}</p>
    {outcome.nextStatus && <p>当前状态：{outcome.nextStatus}</p>}
  </section>;

  if (outcome.kind === 'validation-failed') return <section role="alert" aria-label="校验失败">
    <h2>校验未通过</h2>
    <ul>{outcome.errors.map((error) => <li key={error.id}>{error.message}</li>)}</ul>
  </section>;

  if (outcome.kind === 'business-rejected') return <section role="alert" aria-label="业务拒绝">
    <h2>业务拒绝：{outcome.reason}</h2>
  </section>;

  const actual = outcome.succeeded + outcome.failed.length + outcome.unprocessed;
  if (actual !== outcome.total) return <section role="alert" aria-label="部分完成结果异常">
    <h2>结果计数不一致</h2>
    <p>声明共 {outcome.total}，但成功 {outcome.succeeded}、失败 {outcome.failed.length}、未处理 {outcome.unprocessed} 共计 {actual}。</p>
  </section>;

  return <section role="alert" aria-label="部分完成">
    <h2>部分完成</h2>
    <p>成功 {outcome.succeeded}，失败 {outcome.failed.length}，未处理 {outcome.unprocessed}，共 {outcome.total}。</p>
    {outcome.failed.length > 0 && <ul>{outcome.failed.map((failure) => <li key={failure.id}>{failure.id}：{failure.reason}</li>)}</ul>}
  </section>;
}
