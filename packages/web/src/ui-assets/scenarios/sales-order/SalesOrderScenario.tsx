import { useState } from 'react';
import { MasterDetailDocument } from '../../templates/master-detail-document/MasterDetailDocument';
import { createSalesOrderAdapter } from './adapter';
import { createSalesOrderScenario, type SalesOrderSimulation } from './config';

export function SalesOrderScenario({ initialOutcome }: { initialOutcome?: SalesOrderSimulation }) {
  const [scenario] = useState(() => createSalesOrderScenario(createSalesOrderAdapter(initialOutcome)));
  return <section aria-label="销售订单确定性场景">
    <p>追溯：{scenario.traceability.directSourceRefs.join('、')}；{scenario.traceability.assetRefs.join('、')}；QA：{scenario.traceability.qaStatus}（{scenario.traceability.qaRef}）。</p>
    <MasterDetailDocument scenario={scenario} />
  </section>;
}
