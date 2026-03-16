import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DB_PATH = join(DATA_DIR, "analyzer.db");

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA synchronous = NORMAL");
  _db.exec("PRAGMA cache_size = -64000");
  _db.exec("PRAGMA temp_store = MEMORY");
  _db.exec("PRAGMA mmap_size = 268435456");
  _db.exec("PRAGMA foreign_keys = ON");
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}

export function dbExists(): boolean {
  return existsSync(DB_PATH);
}

export { DB_PATH, DATA_DIR };
