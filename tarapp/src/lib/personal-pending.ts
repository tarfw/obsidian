import { getDeviceDb } from './db';

type PendingStep = { id: string; runId: string };

async function db() {
  const device = getDeviceDb();
  await device.connect();
  await device.exec('CREATE TABLE IF NOT EXISTS personal_pending_step (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created INTEGER NOT NULL)');
  return device;
}

export async function queuePersonalStep(runId: string): Promise<string> {
  const id = `personal-step:${runId}:${Date.now()}`;
  const device = await db();
  await device.run('INSERT OR IGNORE INTO personal_pending_step (id, run_id, created) VALUES (?, ?, ?)', [id, runId, Date.now()]);
  return id;
}

export async function pendingPersonalSteps(): Promise<PendingStep[]> {
  const device = await db();
  return await device.all('SELECT id, run_id AS runId FROM personal_pending_step ORDER BY created ASC') as PendingStep[];
}

export async function removePendingPersonalStep(id: string): Promise<void> {
  const device = await db();
  await device.run('DELETE FROM personal_pending_step WHERE id = ?', [id]);
}
