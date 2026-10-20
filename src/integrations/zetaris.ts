import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Dataset } from '../domain/types.ts';

const safeError = () => new Error('Zetaris synthetic snapshot query unavailable. Check local connection configuration.');

/** Join only the selected synthetic snapshot; subprocess errors never expose upstream content. */
export async function loadZetarisDataset(
  dataset: Dataset, caseId: string, config: { repo: string; envFile: string; python?: string },
): Promise<Dataset> {
  const selected = dataset.cases.find(item => item.id === caseId);
  if (!selected || !config.repo || !config.envFile) throw safeError();
  const snapshot: Dataset = {
    asOf: dataset.asOf, cases: [selected],
    events: dataset.events.filter(item => item.caseId === caseId), rules: dataset.rules,
  };
  const input = JSON.stringify({ dataset: snapshot, caseId });
  if (Buffer.byteLength(input) > 128 * 1024) throw safeError();
  return new Promise((resolve, reject) => {
    // Credentials are loaded only by the helper from the explicitly configured file.
    const env: NodeJS.ProcessEnv = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE']) {
      if (process.env[key]) env[key] = process.env[key];
    }
    const child = childProcess.execFile(config.python || 'python', [
      fileURLToPath(new URL('./zetaris-query.py', import.meta.url)), config.repo, config.envFile,
    ], { timeout: 120_000, maxBuffer: 256 * 1024, encoding: 'utf8', windowsHide: true, env },
    (error, stdout) => {
      if (error) return reject(safeError());
      try {
        const result: unknown = JSON.parse(stdout);
        // The remote result may verify synthetic data, but cannot introduce or alter evidence.
        if (JSON.stringify(result) !== JSON.stringify(snapshot)) throw safeError();
        resolve(result as Dataset);
      } catch { reject(safeError()); }
    });
    child.stdin?.on('error', () => reject(safeError()));
    child.stdin?.end(input);
  });
}
