export class WorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
  }
}

export class LeadReviewWorkflow {
  constructor(lead, options = {}) {
    this.lead = structuredClone(lead);
    this.now = options.now ?? (() => new Date().toISOString());
    this.lead.history ??= [];
  }

  submit() {
    return this.#transition('active', 'in_review');
  }

  qualify() {
    return this.#transition('in_review', 'qualified');
  }

  reject(reason) {
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new WorkflowError('VALIDATION_ERROR', 'rejection reason is required');
    }
    return this.#transition('in_review', 'rejected', reason.trim());
  }

  snapshot() {
    return structuredClone(this.lead);
  }

  #transition(expected, target, reason = null) {
    if (this.lead.status !== expected) {
      throw new WorkflowError(
        'INVALID_TRANSITION',
        `cannot transition from ${this.lead.status} to ${target}`,
      );
    }

    const from = this.lead.status;
    this.lead.status = target;
    this.lead.history.push({ from, to: target, at: this.now(), reason });
    return this.snapshot();
  }
}
