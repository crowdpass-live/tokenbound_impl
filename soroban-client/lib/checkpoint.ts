/**
 * Event consumer checkpointing.
 *
 * Long-running event consumers (the Horizon indexer) need to survive restarts
 * without re-scanning from the beginning of the chain. A checkpoint persists
 * the consumer's cursor and a snapshot of decoded events so it can resume
 * exactly where it left off.
 *
 * Two implementations are provided:
 *   - FileCheckpointStore: durable JSON on disk, atomic writes via tmp+rename.
 *   - MemoryCheckpointStore: in-process, used by tests.
 *   - NoopCheckpointStore: opt-out; load() always returns null, save() is a no-op.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { IndexedEvent } from "@/lib/indexer";

export const CHECKPOINT_SCHEMA_VERSION = 1;

export interface ConsumerCheckpoint {
  version: number;
  lastLedger: number;
  cursor?: string;
  events: IndexedEvent[];
  updatedAt: number;
}

export interface CheckpointStore {
  load(): Promise<ConsumerCheckpoint | null>;
  save(checkpoint: ConsumerCheckpoint): Promise<void>;
  reset(): Promise<void>;
}

// ── File-backed store ────────────────────────────────────────────────────────

export class FileCheckpointStore implements CheckpointStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<ConsumerCheckpoint | null> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt checkpoint — discard rather than crash the consumer.
      return null;
    }

    if (!isValidCheckpoint(parsed)) return null;
    if (parsed.version !== CHECKPOINT_SCHEMA_VERSION) return null;
    return parsed;
  }

  async save(checkpoint: ConsumerCheckpoint): Promise<void> {
    // Serialize concurrent saves to avoid interleaved tmp-file collisions.
    const next = this.writeChain.then(() => this.atomicWrite(checkpoint));
    this.writeChain = next.catch(() => undefined);
    return next;
  }

  async reset(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  private async atomicWrite(checkpoint: ConsumerCheckpoint): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(checkpoint);
    try {
      await fs.writeFile(tmp, payload, "utf8");
      await fs.rename(tmp, this.filePath);
    } catch (err) {
      await fs.unlink(tmp).catch(() => undefined);
      throw err;
    }
  }
}

// ── In-memory store ──────────────────────────────────────────────────────────

export class MemoryCheckpointStore implements CheckpointStore {
  private current: ConsumerCheckpoint | null = null;

  async load(): Promise<ConsumerCheckpoint | null> {
    return this.current ? cloneCheckpoint(this.current) : null;
  }

  async save(checkpoint: ConsumerCheckpoint): Promise<void> {
    this.current = cloneCheckpoint(checkpoint);
  }

  async reset(): Promise<void> {
    this.current = null;
  }
}

// ── No-op store ──────────────────────────────────────────────────────────────

export class NoopCheckpointStore implements CheckpointStore {
  async load(): Promise<ConsumerCheckpoint | null> {
    return null;
  }
  async save(): Promise<void> {}
  async reset(): Promise<void> {}
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createDefaultCheckpointStore(): CheckpointStore {
  if (process.env.EVENT_CHECKPOINT_DISABLED === "1") {
    return new NoopCheckpointStore();
  }
  const configured = process.env.EVENT_CHECKPOINT_PATH;
  const target =
    configured && configured.length > 0
      ? configured
      : path.join(process.cwd(), ".checkpoints", "events.json");
  return new FileCheckpointStore(target);
}

// ── Cloning ──────────────────────────────────────────────────────────────────

// Checkpoints are plain JSON, so a JSON round-trip is sufficient and avoids
// relying on `structuredClone` being available in every test environment.
function cloneCheckpoint(checkpoint: ConsumerCheckpoint): ConsumerCheckpoint {
  return JSON.parse(JSON.stringify(checkpoint)) as ConsumerCheckpoint;
}

// ── Validation ───────────────────────────────────────────────────────────────

function isValidCheckpoint(value: unknown): value is ConsumerCheckpoint {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "number" &&
    typeof v.lastLedger === "number" &&
    typeof v.updatedAt === "number" &&
    Array.isArray(v.events)
  );
}
