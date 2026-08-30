import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BusinessError,
  CustomerLeadService,
  InMemoryLeadRepository,
} from './customer-lead.mjs';

function createFixture() {
  const repository = new InMemoryLeadRepository();
  const service = new CustomerLeadService(repository, {
    createId: () => 'lead-001',
    now: () => '2026-08-29T00:00:00.000Z',
  });
  return { repository, service };
}

test('TC-001: creates an active lead with stable fields', () => {
  const { service } = createFixture();
  const lead = service.create({
    name: 'Ada',
    email: 'ada@example.com',
    source: 'event',
  });

  assert.deepEqual(lead, {
    id: 'lead-001',
    name: 'Ada',
    email: 'ada@example.com',
    source: 'event',
    status: 'active',
    createdAt: '2026-08-29T00:00:00.000Z',
  });
});

test('TC-002: normalizes email and trims text fields', () => {
  const { service } = createFixture();
  const lead = service.create({
    name: ' Ada ',
    email: ' ADA@Example.COM ',
    source: ' event ',
  });

  assert.equal(lead.name, 'Ada');
  assert.equal(lead.email, 'ada@example.com');
  assert.equal(lead.source, 'event');
});

test('TC-003: rejects a blank name without saving', () => {
  const { repository, service } = createFixture();

  assert.throws(
    () => service.create({ name: ' ', email: 'ada@example.com', source: 'event' }),
    (error) => error instanceof BusinessError && error.code === 'VALIDATION_ERROR',
  );
  assert.equal(repository.count(), 0);
});

test('TC-004: rejects an invalid email without saving', () => {
  const { repository, service } = createFixture();

  assert.throws(
    () => service.create({ name: 'Ada', email: 'invalid', source: 'event' }),
    (error) => error instanceof BusinessError && error.code === 'VALIDATION_ERROR',
  );
  assert.equal(repository.count(), 0);
});

test('TC-005: rejects a duplicate normalized active email', () => {
  const { repository, service } = createFixture();
  service.create({ name: 'Ada', email: 'ada@example.com', source: 'event' });

  assert.throws(
    () => service.create({ name: 'Ada 2', email: ' ADA@example.com ', source: 'web' }),
    (error) => error instanceof BusinessError && error.code === 'DUPLICATE_EMAIL',
  );
  assert.equal(repository.count(), 1);
});

test('TC-006: retrieves a created lead and returns null for an unknown id', () => {
  const { service } = createFixture();
  const created = service.create({
    name: 'Ada',
    email: 'ada@example.com',
    source: 'event',
  });

  assert.deepEqual(service.findById(created.id), created);
  assert.equal(service.findById('unknown'), null);
});
