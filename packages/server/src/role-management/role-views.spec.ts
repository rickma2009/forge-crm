import { roleViewAssignmentSchema } from './role-views';

describe('role view assignment contract', () => {
  it('rejects duplicate views and unknown options rather than silently granting them', () => {
    const id = 'bfc009a1-8e75-4981-8d89-c51edc286270';
    expect(roleViewAssignmentSchema.safeParse({ version: 1, viewIds: [id, id] }).success).toBe(false);
    expect(roleViewAssignmentSchema.safeParse({ version: 1, viewIds: [], allowAll: true }).success).toBe(false);
  });
  it('requires an optimistic concurrency token and allows explicitly removing all views', () => {
    expect(roleViewAssignmentSchema.safeParse({ viewIds: [] }).success).toBe(false);
    expect(roleViewAssignmentSchema.parse({ version: 2, viewIds: [] })).toEqual({ version: 2, viewIds: [] });
  });
});
