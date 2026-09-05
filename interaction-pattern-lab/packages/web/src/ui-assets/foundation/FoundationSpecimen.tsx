import './enterprise-tokens.css';
import { IconCircleCheck } from '@tabler/icons-react';
import { foundationSpecimensByRouteId, type FoundationRouteId, type FoundationToken } from './foundation-manifest';

const coverageLabel = { implemented: '已实现', gap: '缺口' } as const;

export function FoundationSpecimen({ routeId }: { routeId: FoundationRouteId }) {
  const specimen = foundationSpecimensByRouteId[routeId];
  const gaps = specimen.tokens.filter((token) => token.coverage === 'gap');

  return <section className="foundation-specimen" aria-labelledby={`${routeId}-title`}>
    <header className="foundation-specimen-header"><p>MINIMUM FOUNDATION ASSET</p><h1 id={`${routeId}-title`}>{specimen.title}</h1><span>{specimen.summary}</span></header>
    <div className="foundation-token-grid">{specimen.tokens.map((token) => <article className="foundation-token" data-testid="foundation-token" key={token.id}>
      <header><code data-testid="foundation-token-id">{token.id}</code><span className={`foundation-coverage${token.coverage === 'gap' ? ' is-gap' : ''}`} data-testid="foundation-token-coverage">{coverageLabel[token.coverage]}</span></header>
      <dl><dt>取值</dt><dd>{token.value}</dd><dt>来源</dt><dd data-testid="foundation-token-source">{token.sourceRefs.join('；')}</dd><dt>消费者</dt><dd data-testid="foundation-token-consumers">{token.consumerIds.join('；')}</dd></dl>
      <TokenConsumer token={token} />
      <p className="foundation-token-purpose">{token.purpose}</p>
    </article>)}</div>
    {gaps.length > 0 && <section className="foundation-gaps" aria-labelledby={`${routeId}-gaps`}><h2 id={`${routeId}-gaps`}>明确缺口</h2><p>以下项被有意保留为未覆盖范围，不应由当前页面临时补造。</p><ul>{gaps.map((token) => <li data-testid="foundation-gap" key={token.id}><code>{token.id}</code>：{token.purpose}（消费者：{token.consumerIds.join('、')}）</li>)}</ul></section>}
  </section>;
}

function TokenConsumer({ token }: { token: FoundationToken }) {
  if (token.id === 'focus.visible') return <button className="foundation-focus-target" type="button">焦点样本</button>;
  if (token.id === 'icon.size.control') return <span className="foundation-icon-preview"><IconCircleCheck aria-hidden="true" className="foundation-icon-sample" /> 图标尺寸样本</span>;
  if (token.id === 'state.async.pending' || token.id === 'state.async.failure') return <p className="foundation-async-state" role="status">{token.value}</p>;
  return null;
}
