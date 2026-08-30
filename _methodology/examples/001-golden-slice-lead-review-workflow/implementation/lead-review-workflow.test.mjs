import assert from 'node:assert/strict';
import test from 'node:test';
import { LeadReviewWorkflow, WorkflowError } from './lead-review-workflow.mjs';

function workflow(status = 'active') {
  return new LeadReviewWorkflow(
    { id: 'lead-001', status, history: [] },
    { now: () => '2026-08-29T00:00:00.000Z' },
  );
}

test('TC-001: submits an active lead for review', () => {
  const result = workflow().submit();
  assert.equal(result.status, 'in_review');
  assert.deepEqual(result.history[0], {
    from: 'active', to: 'in_review', at: '2026-08-29T00:00:00.000Z', reason: null,
  });
});

test('TC-002: qualifies a lead in review', () => {
  const result = workflow('in_review').qualify();
  assert.equal(result.status, 'qualified');
  assert.equal(result.history.length, 1);
});

test('TC-003: rejects a lead in review with a reason', () => {
  const result = workflow('in_review').reject('Not a fit');
  assert.equal(result.status, 'rejected');
  assert.equal(result.history[0].reason, 'Not a fit');
});

test('TC-004: rejects an invalid transition without mutation', () => {
  const subject = workflow('active');
  assert.throws(
    () => subject.qualify(),
    (error) => error instanceof WorkflowError && error.code === 'INVALID_TRANSITION',
  );
  assert.deepEqual(subject.snapshot(), { id: 'lead-001', status: 'active', history: [] });
});

test('TC-005: rejects an empty rejection reason without mutation', () => {
  const subject = workflow('in_review');
  assert.throws(
    () => subject.reject(' '),
    (error) => error instanceof WorkflowError && error.code === 'VALIDATION_ERROR',
  );
  assert.deepEqual(subject.snapshot(), { id: 'lead-001', status: 'in_review', history: [] });
});
