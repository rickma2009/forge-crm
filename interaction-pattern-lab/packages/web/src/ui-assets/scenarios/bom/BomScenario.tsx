import { useState } from 'react';
import { MasterDetailDocument } from '../../templates/master-detail-document/MasterDetailDocument';
import { createBomAdapter } from './adapter';
import { createBomScenario } from './config';

export function BomScenario() {
  const [scenario] = useState(() => createBomScenario(createBomAdapter()));
  const [reviewedCandidate, setReviewedCandidate] = useState<string | null>(null);
  const { budget, hierarchyPreview, candidateReview } = scenario.extension;

  return <section aria-label="装配清单确定性场景">
    <p>追溯：{scenario.traceability.directSourceRefs.join('、')}；{scenario.traceability.extractionRefs.join('、')}；{scenario.traceability.assetRefs.join('、')}；QA：{scenario.traceability.qaStatus}。</p>
    <section aria-label="层级与候选扩展">
      <p>演示深度 {budget.maxDepth} 层；行预算 {budget.maxRows} 行（当前 {scenario.initialState.lines.length} 行）。</p>
      <ul role="tree" aria-label="层级预览">
        {hierarchyPreview.map((entry) => <li key={entry.id} role="treeitem" aria-level={entry.level}>
          {entry.label} {entry.differenceCue === '一致' ? <span>差异：一致</span> : <mark>差异：{entry.differenceCue}</mark>}
        </li>)}
      </ul>
      <button type="button" onClick={() => setReviewedCandidate(candidateReview.id)}>复核候选 {candidateReview.id}</button>
      {reviewedCandidate && <p role="status" aria-label="候选复核结果">已复核 {reviewedCandidate}：可作为替代候选，尚未写入任何业务系统。</p>}
    </section>
    <MasterDetailDocument scenario={scenario} />
  </section>;
}
