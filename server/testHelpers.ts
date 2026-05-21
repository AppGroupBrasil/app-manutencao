import { getDb } from './db';

let cached: boolean | null = null;

export async function isDbAvailable(): Promise<boolean> {
  if (cached !== null) return cached;
  if (!process.env.DATABASE_URL) {
    cached = false;
    return false;
  }
  try {
    const db = await getDb();
    if (!db) { cached = false; return false; }
    await db.execute('SELECT 1' as any);
    cached = true;
    return true;
  } catch {
    cached = false;
    return false;
  }
}
