import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Shared persistence for state that must survive across separate module instances
 * within a server process (see AGENTS.md's "known architectural gotcha") — and,
 * critically, across a real Vercel deployment, where the filesystem is read-only
 * outside /tmp. A plain fs.writeFileSync against data/*.json (the original fix for
 * the module-instance-splitting bug) works locally and even under `next start` on a
 * real machine, but throws on Vercel's actual serverless runtime — confirmed via a
 * 500 on the live deployment when sending a nudge / approving an intervention.
 *
 * On Vercel (KV_REST_API_URL / KV_REST_API_TOKEN set — the standard Upstash/Vercel
 * KV integration env vars, already provisioned for this project), state is stored in
 * Vercel KV, one key per store. With no KV connection configured (plain `npm run dev`
 * with no KV_* env vars), falls back to a JSON file under data/ so local development
 * keeps working standalone with zero external dependencies.
 */

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Imported lazily so a local dev environment with no KV env vars never even loads
// the client (and building for such an environment can't fail on a missing key).
async function getKvClient() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

function filePath(fileName: string): string {
  return path.join(process.cwd(), "data", fileName);
}

/** Reads persisted state for `key`, falling back to `seed` on first run or on any read failure. */
export async function readState<T>(key: string, fileName: string, seed: T): Promise<T> {
  if (KV_CONFIGURED) {
    try {
      const value = await (await getKvClient()).get<T>(key);
      return value ?? seed;
    } catch (err) {
      console.error(`[kv-store] Failed to read "${key}" from Vercel KV — falling back to seed data.`, err);
      return seed;
    }
  }

  try {
    const raw = fs.readFileSync(filePath(fileName), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

/**
 * Persists state for `key`. Throws a clear, descriptive error on failure — callers
 * must catch this and turn it into a real `{ ok: false, error }` result rather than
 * letting it fail silently or surface as an opaque Server Action digest.
 */
export async function writeState<T>(key: string, fileName: string, value: T): Promise<void> {
  if (KV_CONFIGURED) {
    try {
      await (await getKvClient()).set(key, value);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to save "${key}" to Vercel KV: ${message}`);
    }
    return;
  }

  try {
    fs.writeFileSync(filePath(fileName), JSON.stringify(value, null, 2) + "\n", "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to save "${key}" to disk: ${message}`);
  }
}
