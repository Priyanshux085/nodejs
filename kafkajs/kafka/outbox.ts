import { randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";
import type { Producer, RecordMetadata } from "kafkajs";

export type JsonMap = Record<string, unknown>;

export interface OutboxEventInput {
  topic: string;
  eventType: string;
  payload: JsonMap;
  key?: string;
  headers?: Record<string, string>;
}

export interface OutboxEventRecord {
  id: string;
  topic: string;
  eventType: string;
  payload: JsonMap;
  key: string | null;
  headers: Record<string, string>;
  attempts: number;
}

interface OutboxRow {
  id: string;
  topic: string;
  event_type: string;
  payload: string;
  event_key: string | null;
  headers: string | null;
  attempts: number;
}

export interface OutboxOptions {
  batchSize?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  workerId?: string;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 60_000;

export class OutboxStore {
  private readonly db: Database;

  constructor(filename = "outbox.db") {
    this.db = new Database(filename, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA synchronous = NORMAL;");
    this.createSchema();
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        event_key TEXT,
        headers TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        locked_at INTEGER,
        published_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_pending
      ON outbox_events(status, next_attempt_at, created_at);
    `);
  }

  enqueue(event: OutboxEventInput): string {
    const id = randomUUID();
    const now = Date.now();
    const insert = this.db.query(
      `
      INSERT INTO outbox_events (
        id, topic, event_type, payload, event_key, headers,
        status, attempts, next_attempt_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `,
    );

    insert.run(
      id,
      event.topic,
      event.eventType,
      JSON.stringify(event.payload),
      event.key ?? null,
      event.headers ? JSON.stringify(event.headers) : null,
      now,
      now,
    );

    return id;
  }

  claimBatch(batchSize: number, maxAttempts: number): OutboxEventRecord[] {
    const now = Date.now();
    const lockTimeoutMs = 30_000;
    const staleLockCutoff = now - lockTimeoutMs;

    const query = this.db.query<OutboxRow, [number, number, number, number]>(`
      SELECT id, topic, event_type, payload, event_key, headers, attempts
      FROM outbox_events
      WHERE (
        status = 'pending'
        OR (status = 'processing' AND locked_at < ?)
      )
      AND next_attempt_at <= ?
      AND attempts < ?
      ORDER BY created_at ASC
      LIMIT ?
    `);

    const rows = query.all(staleLockCutoff, now, maxAttempts, batchSize);
    if (rows.length === 0) {
      return [];
    }

    const claim = this.db.query(`
      UPDATE outbox_events
      SET status = 'processing', locked_at = ?, attempts = attempts + 1
      WHERE id = ?
    `);

    const claimTx = this.db.transaction((toClaim: OutboxRow[]) => {
      for (const row of toClaim) {
        claim.run(now, row.id);
      }
    });
    claimTx(rows);

    return rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      eventType: row.event_type,
      payload: JSON.parse(row.payload) as JsonMap,
      key: row.event_key,
      headers: row.headers
        ? (JSON.parse(row.headers) as Record<string, string>)
        : {},
      attempts: row.attempts + 1,
    }));
  }

  markPublished(id: string) {
    const now = Date.now();
    const update = this.db.query(`
      UPDATE outbox_events
      SET status = 'published', published_at = ?, last_error = NULL
      WHERE id = ?
    `);
    update.run(now, id);
  }

  markFailed(id: string, error: string, delayMs: number, exhausted: boolean) {
    const now = Date.now();
    const nextAttemptAt = now + delayMs;
    const nextStatus = exhausted ? "dead" : "pending";

    const update = this.db.query(`
      UPDATE outbox_events
      SET status = ?, next_attempt_at = ?, last_error = ?
      WHERE id = ?
    `);
    update.run(nextStatus, nextAttemptAt, error, id);
  }

  getStats() {
    const row = this.db
      .query<
        {
          pending: number;
          processing: number;
          published: number;
          dead: number;
        },
        []
      >(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
          SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) AS dead
        FROM outbox_events
      `)
      .get();

    return {
      pending: row?.pending ?? 0,
      processing: row?.processing ?? 0,
      published: row?.published ?? 0,
      dead: row?.dead ?? 0,
    };
  }
}

export class KafkaOutboxPublisher {
  private readonly producer: Producer;
  private readonly store: OutboxStore;
  private readonly workerId: string;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;

  constructor(producer: Producer, store: OutboxStore, options: OutboxOptions = {}) {
    this.producer = producer;
    this.store = store;
    this.workerId = options.workerId ?? randomUUID();
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
  }

  async flushOnce(): Promise<RecordMetadata[]> {
    const events = this.store.claimBatch(this.batchSize, this.maxAttempts);
    if (events.length === 0) {
      return [];
    }

    const metadata: RecordMetadata[] = [];
    for (const event of events) {
      try {
        const sent = await this.producer.send({
          topic: event.topic,
          messages: [
            {
              key: event.key ?? undefined,
              value: JSON.stringify(event.payload),
              headers: {
                ...event.headers,
                eventType: event.eventType,
                outboxId: event.id,
              },
            },
          ],
        });

        metadata.push(...sent);
        this.store.markPublished(event.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown publish error";
        const exhausted = event.attempts >= this.maxAttempts;
        const backoff = Math.min(
          this.retryDelayMs * 2 ** Math.max(event.attempts - 1, 0),
          this.maxRetryDelayMs,
        );
        this.store.markFailed(event.id, message, backoff, exhausted);
      }
    }

    return metadata;
  }

  async runUntil(signal: AbortSignal, pollIntervalMs = 1000) {
    while (!signal.aborted) {
      await this.flushOnce();
      await Bun.sleep(pollIntervalMs);
    }
  }

  getWorkerId() {
    return this.workerId;
  }
}