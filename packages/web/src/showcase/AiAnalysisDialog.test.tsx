import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, it, afterEach, expect } from 'vitest';
import { AiAnalysisDialog } from './AiAnalysisDialog';
import { aiAnalysisApi } from './ai-analysis-api';
import { aiSectionKeys, type AiTask } from '@forge-crm/contracts';
const snapshot = { capturedAt: '2026-09-25T00:00:00.000Z', hash: 'abc', sources: [], opportunity: { id: 'opp', name: '测试商机', stageId: 'stage', stageName: '初始', stageProbability: 10, confidence: 30 }, focus: '', issues: [] };
afterEach(() => vi.restoreAllMocks());
const result = { sections: aiSectionKeys.map(key => ({ key, items: [{ text: `待核实 ${key}`, kind: 'UNKNOWN' as const, sourceIds: [] }] })) };
it('restores an existing task and saves the edited result only on confirmation', async () => {
  const task = { id: 'task', opportunityId: 'opp', status: 'SUCCEEDED', snapshot, result, confirmedResult: null, analysisId: null, provider: 'mock', model: 'mock', isOwner: true, createdAt: snapshot.capturedAt, createdBy: 'actor', templateVersion: 'opportunity-v1', schemaVersion: '1', confirmedAt: null, staleAtConfirmation: false, error: null, parentTaskId: null } as AiTask;
  vi.spyOn(aiAnalysisApi, 'preview').mockResolvedValue({ snapshot, configuration: { configured: true, provider: 'mock', model: 'mock', timeoutMs: 1000, maxInputChars: 100000, dailyLimit: 30 }, inputChars: 200 });
  vi.spyOn(aiAnalysisApi, 'list').mockResolvedValue({ items: [task], total: 1, page: 1 });
  vi.spyOn(aiAnalysisApi, 'detail').mockResolvedValue(task);
  const confirm = vi.spyOn(aiAnalysisApi, 'confirm').mockResolvedValue({ ...task, analysisId: 'analysis', confirmedResult: result });
  render(<AiAnalysisDialog systemCode="demo-portal" opportunityId="opp" canGenerate canConfirm onClose={() => {}} onSaved={() => {}} />);
  const field = await screen.findByLabelText('商机现状摘要 1');
  fireEvent.change(field, { target: { value: '人工审阅后的内容' } });
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认保存' }));
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(confirm.mock.calls[0][3].sections[0].items[0].text).toBe('人工审阅后的内容');
});
it('shows unconfigured service and prevents accidental generation', async () => {
  vi.spyOn(aiAnalysisApi, 'preview').mockResolvedValue({ snapshot, configuration: { configured: false, provider: 'anthropic', model: 'CVTE-AUTO', timeoutMs: 1000, maxInputChars: 100000, dailyLimit: 30 }, inputChars: 200 });
  vi.spyOn(aiAnalysisApi, 'list').mockResolvedValue({ items: [], total: 0, page: 1 });
  render(<AiAnalysisDialog systemCode="demo-portal" opportunityId="opp" canGenerate canConfirm onClose={() => {}} onSaved={() => {}} />);
  expect(await screen.findByText('尚未配置AI服务，请联系管理员')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开始分析' })).toBeDisabled();
});
