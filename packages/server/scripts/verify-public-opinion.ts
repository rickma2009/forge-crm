import { config } from 'dotenv';
import { resolve } from 'node:path';
import { deOpinionCenterSchema } from '@forge-crm/contracts';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

const baseUrl = 'http://localhost:3000';
const browserOrigin = 'http://localhost:5173';
const systemCode = 'demo-portal';
const cookies = new Map<string, string>();

async function request(path: string, method = 'GET', body?: unknown, allow401 = false) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      origin: browserOrigin,
      cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      'content-type': 'application/json',
      'x-csrf-token': cookies.get('ipl_csrf') ?? '',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const split = pair.indexOf('=');
    if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }
  if (!response.ok && !(allow401 && response.status === 401)) {
    throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`);
  }
  return response;
}

async function main() {
  if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('Local admin password is not configured');
  await request('/api/auth/session', 'GET', undefined, true);
  await request('/api/auth/login', 'POST', { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD });
  try {
    const root = `/api/systems/${systemCode}/digital-employees/public-opinion`;
    const before = deOpinionCenterSchema.parse(await (await request(root)).json());
    if (before.topic.brand !== 'MAXHUB') throw new Error('MAXHUB topic was not initialized');
    if (before.items.length < 20 || before.events.length < 8 || before.tasks.length < 6 || before.runs.length < 5) {
      throw new Error('Public-opinion demo dataset is incomplete');
    }
    const started = (await (await request(`${root}/runs`, 'POST', {
      sourceCodes: ['file-import'],
      rangeHours: 24,
      useAi: false,
      previewOnly: true,
    })).json()) as { runId: string };
    let after = before;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((done) => setTimeout(done, 100));
      after = deOpinionCenterSchema.parse(await (await request(root)).json());
      const run = after.runs.find((row) => row.id === started.runId);
      if (run && ['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(run.status)) break;
    }
    const run = after.runs.find((row) => row.id === started.runId);
    if (!run || run.status !== 'SUCCEEDED') throw new Error(`Manual preview run did not finish successfully: ${run?.status ?? 'missing'}`);
    if (after.items.length !== before.items.length || after.events.length !== before.events.length) {
      throw new Error('Preview run unexpectedly persisted external items or events');
    }
    console.log(JSON.stringify({
      topic: after.topic.brand,
      items: after.items.length,
      events: after.events.length,
      tasks: after.tasks.length,
      sources: after.sources.length,
      manualPreviewRun: run.status,
      backgroundSchedule: false,
    }, null, 2));
  } finally {
    await request('/api/auth/logout', 'POST');
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Verification failed');
  process.exitCode = 1;
});
