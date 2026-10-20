import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import childProcess from 'node:child_process';
import type { Dataset } from '../src/domain/types.ts';
import { loadZetarisDataset } from '../src/integrations/zetaris.ts';

const data = JSON.parse(readFileSync(new URL('../data/demo.json', import.meta.url), 'utf8')) as Dataset;

test('Zetaris subprocess sends selected snapshots through stdin with bounded execution', async t => {
  let request = '';
  t.mock.method(childProcess, 'execFile', (executable: string, args: string[], options: Record<string, unknown>, callback: Function) => {
    assert.equal(executable, 'python');
    assert.deepEqual(args.slice(1), ['approved-repo', 'explicit-env']);
    assert.equal(options.timeout, 120000);
    assert.equal(options.maxBuffer, 256 * 1024);
    assert.equal((options.env as Record<string, string>).ZETARIS_API_KEY, undefined);
    assert.equal(options.shell, undefined);
    const stdin = new PassThrough();
    stdin.on('data', chunk => { request += chunk.toString(); });
    stdin.on('finish', () => callback(null, JSON.stringify(JSON.parse(request).dataset), ''));
    return { stdin };
  });
  const result = await loadZetarisDataset(data, 'FE-101', { repo: 'approved-repo', envFile: 'explicit-env' });
  assert.deepEqual(result.cases.map(c => c.id), ['FE-101']);
  assert.equal(result.events.length, 3);
  assert.equal(result.rules.length, 4);
  assert.equal(result.asOf, data.asOf);
  assert.equal(JSON.parse(request).caseId, 'FE-101');
});

test('Zetaris rejects altered evidence and hides upstream error content', async t => {
  const mock = t.mock.method(childProcess, 'execFile', (_exe: unknown, _args: unknown, _options: unknown, callback: Function) => {
    queueMicrotask(() => callback(null, JSON.stringify({ ...data, asOf: 'altered' }), 'private upstream error'));
    return { stdin: new PassThrough() };
  });
  await assert.rejects(loadZetarisDataset(data, 'FE-101', { repo: 'r', envFile: 'e' }), /synthetic snapshot query unavailable/);
  mock.mock.mockImplementation((_exe: unknown, _args: unknown, _options: unknown, callback: Function) => {
    queueMicrotask(() => callback(new Error('SECRET and raw upstream body'), '', 'SECRET'));
    return { stdin: new PassThrough() };
  });
  await assert.rejects(loadZetarisDataset(data, 'FE-101', { repo: 'r', envFile: 'e' }), error => {
    assert.doesNotMatch(String(error), /SECRET|upstream body/);
    return true;
  });
});

test('unknown IDs fail before starting a process', async t => {
  const mock = t.mock.method(childProcess, 'execFile', () => { throw new Error('must not execute'); });
  await assert.rejects(loadZetarisDataset(data, "FE-101' OR 1=1", { repo: 'r', envFile: 'e' }));
  assert.equal(mock.mock.callCount(), 0);
});
