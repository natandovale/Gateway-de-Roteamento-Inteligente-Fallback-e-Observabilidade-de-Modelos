import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export interface RequestLogRecord {
  id: string;
  timestamp: string;
  strategy: string;
  modelRequested: string;
  modelExecuted: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  fallbackTriggered: boolean;
  fallbackAttempts: number;
  statusCode: number;
}

export interface ModelMetricRecord {
  model: string;
  latencyMs: number;
  throughputTps: number;
  success: boolean;
  timestamp: string;
}

export interface ModelPerformanceSummary {
  model: string;
  total_requests: number;
  avg_latency_ms: number;
  avg_throughput_tps: number;
  error_count: number;
}

export interface CachedModel {
  id: string;
  name: string;
  promptPricePerMillion: number;
  completionPricePerMillion: number;
  contextLength: number;
}

export class SqliteRepository {
  private db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ':memory:') {
      const dir = path.dirname(databasePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(databasePath);
  }

  public init(): void {
    // 1. Tabela de auditoria de requisições
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        strategy TEXT NOT NULL,
        model_requested TEXT NOT NULL,
        model_executed TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        cost_usd REAL NOT NULL,
        latency_ms INTEGER NOT NULL,
        fallback_triggered INTEGER NOT NULL,
        fallback_attempts INTEGER NOT NULL,
        status_code INTEGER NOT NULL
      );
    `);

    // 2. Tabela de métricas operacionais por modelo (latência e throughput)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        throughput_tps REAL NOT NULL,
        success INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_metrics_model ON model_metrics(model);
    `);

    // 3. Tabela de cache do catálogo do OpenRouter
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS models_cache (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt_price_per_million REAL NOT NULL,
        completion_price_per_million REAL NOT NULL,
        context_length INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  public listTables(): string[] {
    const query = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `);
    const rows = query.all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  public recordRequest(log: RequestLogRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO requests_log (
        id, timestamp, strategy, model_requested, model_executed,
        prompt_tokens, completion_tokens, total_tokens, cost_usd,
        latency_ms, fallback_triggered, fallback_attempts, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      log.id,
      log.timestamp,
      log.strategy,
      log.modelRequested,
      log.modelExecuted,
      log.promptTokens,
      log.completionTokens,
      log.totalTokens,
      log.costUsd,
      log.latencyMs,
      log.fallbackTriggered ? 1 : 0,
      log.fallbackAttempts,
      log.statusCode
    );
  }

  public getRequestLogs(limit = 50): Record<string, unknown>[] {
    const query = this.db.prepare(`
      SELECT * FROM requests_log ORDER BY timestamp DESC LIMIT ?;
    `);
    return query.all(limit) as Record<string, unknown>[];
  }

  public recordModelMetric(metric: ModelMetricRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO model_metrics (
        model, latency_ms, throughput_tps, success, timestamp
      ) VALUES (?, ?, ?, ?, ?);
    `);

    stmt.run(
      metric.model,
      metric.latencyMs,
      metric.throughputTps,
      metric.success ? 1 : 0,
      metric.timestamp
    );
  }

  public getModelPerformanceSummary(model: string): ModelPerformanceSummary | null {
    const query = this.db.prepare(`
      SELECT 
        model,
        COUNT(*) as total_requests,
        AVG(latency_ms) as avg_latency_ms,
        AVG(throughput_tps) as avg_throughput_tps,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
      FROM model_metrics
      WHERE model = ?
      GROUP BY model;
    `);

    const row = query.get(model) as
      | {
          model: string;
          total_requests: number;
          avg_latency_ms: number;
          avg_throughput_tps: number;
          error_count: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      model: row.model,
      total_requests: Number(row.total_requests),
      avg_latency_ms: Math.round(Number(row.avg_latency_ms)),
      avg_throughput_tps: Math.round(Number(row.avg_throughput_tps)),
      error_count: Number(row.error_count),
    };
  }

  public saveModelsCache(models: CachedModel[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO models_cache (
        id, name, prompt_price_per_million, completion_price_per_million, context_length, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?);
    `);

    const now = new Date().toISOString();
    for (const m of models) {
      stmt.run(
        m.id,
        m.name,
        m.promptPricePerMillion,
        m.completionPricePerMillion,
        m.contextLength,
        now
      );
    }
  }

  public getCachedModels(): Record<string, unknown>[] {
    const query = this.db.prepare(`
      SELECT * FROM models_cache ORDER BY prompt_price_per_million ASC;
    `);
    return query.all() as Record<string, unknown>[];
  }

  public close(): void {
    this.db.close();
  }
}
