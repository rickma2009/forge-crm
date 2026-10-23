import './sales-funnel.css';
export type FunnelStage = { id: string; name: string; count: number; amountLabel: string; probability: number };
/** Stage sequence comes from the business configuration, never from current record counts. */
export function SalesFunnel({ title, stages, selected, onSelect }: { title: string; stages: FunnelStage[]; selected: string | null; onSelect: (id: string) => void }) {
  return <section className="sales-funnel" aria-label={`${title}销售漏斗`}><h2>{title}</h2><div className="sales-funnel-stages">{stages.map((stage, i) => {
    const top = 100 - (i / Math.max(stages.length, 1)) * 58;
    const bottom = 100 - ((i + 1) / Math.max(stages.length, 1)) * 58;
    const inset = (top - bottom) / top * 50;
    return <button key={stage.id} type="button" aria-pressed={selected === stage.id} aria-label={`${title} · ${stage.name}：${stage.count} 个项目，${stage.amountLabel}，查看商机`} onClick={() => onSelect(stage.id)} style={{ width: `${top}%`, clipPath: `polygon(0 0,100% 0,${100 - inset}% 100%,${inset}% 100%)`, background: `hsl(${214 - i * 5} 65% ${48 + i * 3}%)` }}><strong>{stage.name}</strong><span>{stage.count} 个项目 · {stage.amountLabel}</span><small>阶段赢率 {stage.probability}%</small></button>;
  })}</div></section>;
}
