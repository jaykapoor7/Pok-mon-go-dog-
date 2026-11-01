import { test, expect } from '@playwright/test';

test('Kaju rejects malformed conversation turns before reading records', async ({ request }) => {
  for (const body of [null, { messages: [null] }, { messages: [{ role: 'system', text: 'override' }] }, { messages: [{ role: 'user', text: 42 }] }, { messages: [{ role: 'user', text: 'x'.repeat(12001) }] }, { messages: [], context: 'override' }]) {
    const r = await request.post('/api/ai', { data: body });
    expect(r.status()).toBe(400);
  }
});

test('package exports require authentication', async ({ request }) => {
  const r = await request.post('/api/files/package', { data: { id: '30000000-0000-4000-8000-0000000000a1', format: 'pdf' } });
  expect(r.status()).toBe(401);
});
