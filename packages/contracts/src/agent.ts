import { z } from 'zod';
import { aiResultSchema, type AiSnapshot, type AiResult, type AiStatus } from './ai-analysis';
export const agentStartSchema = z.strictObject({ requestId: z.string().uuid(), mode: z.enum(['FOLLOW_UP', 'COMMUNICATION_PLAN']), instruction: z.string().trim().max(2000).default('') });
export const agentSaveSchema = z.strictObject({ result: aiResultSchema, followedAt: z.string().datetime(), workItem: z.string().trim().min(1).max(950), resultNext: z.string().trim().min(1).max(2000), acceptStale: z.boolean().default(false) });
export type AgentStart = z.infer<typeof agentStartSchema>;
export type AgentSave = z.infer<typeof agentSaveSchema>;
export type AgentStep = { id: string; kind: 'MODEL' | 'TOOL'; label: string; status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'; at: string; sourceIds: string[] };
export type AgentTask = { id: string; contextId: string; contextType: string; mode: AgentStart['mode']; instruction: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'; snapshot: AiSnapshot; steps: AgentStep[]; result: AiResult | null; confirmedResult: AiResult | null; plan: AgentSave | null; followUpId: string | null; provider: string; model: string; error: string | null; createdAt: string; stale?: boolean };
export type AgentPreview = { configuration: AiStatus; contextName: string; tools: { name: string; label: string }[] };
