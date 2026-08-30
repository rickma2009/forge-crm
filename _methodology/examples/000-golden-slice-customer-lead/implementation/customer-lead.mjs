export class BusinessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
  }
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BusinessError('VALIDATION_ERROR', `${field} is required`);
  }
  return value.trim();
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BusinessError('VALIDATION_ERROR', 'email is invalid');
  }
  return email;
}

export class InMemoryLeadRepository {
  #leads = new Map();

  save(lead) {
    this.#leads.set(lead.id, structuredClone(lead));
    return structuredClone(lead);
  }

  findById(id) {
    const lead = this.#leads.get(id);
    return lead ? structuredClone(lead) : null;
  }

  findActiveByEmail(email) {
    return [...this.#leads.values()].find(
      (lead) => lead.status === 'active' && lead.email === email,
    ) ?? null;
  }

  count() {
    return this.#leads.size;
  }
}

export class CustomerLeadService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  create(input) {
    const name = requireText(input?.name, 'name');
    const email = validateEmail(input?.email);
    const source = requireText(input?.source, 'source');

    if (this.repository.findActiveByEmail(email)) {
      throw new BusinessError('DUPLICATE_EMAIL', 'active lead email already exists');
    }

    return this.repository.save({
      id: this.createId(),
      name,
      email,
      source,
      status: 'active',
      createdAt: this.now(),
    });
  }

  findById(id) {
    return this.repository.findById(id);
  }
}
