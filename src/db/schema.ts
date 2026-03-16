import type { Database } from "bun:sqlite";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_path TEXT,
  started_at INTEGER,
  ended_at INTEGER,
  message_count INTEGER,
  duration_minutes REAL,
  first_prompt TEXT,
  summary TEXT,
  git_branch TEXT,
  is_sidechain INTEGER DEFAULT 0,
  cost_usd REAL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  lines_added INTEGER,
  lines_removed INTEGER
);

CREATE TABLE IF NOT EXISTS history_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  project_path TEXT,
  display TEXT,
  timestamp INTEGER,
  has_paste INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  message_count INTEGER,
  session_count INTEGER,
  tool_call_count INTEGER
);

CREATE TABLE IF NOT EXISTS projects (
  path TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  has_git INTEGER DEFAULT 0,
  has_claude_md INTEGER DEFAULT 0,
  last_commit_date TEXT,
  last_session_date TEXT,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_commits INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT,
  suite_id TEXT,
  subject TEXT,
  description TEXT,
  status TEXT,
  owner TEXT,
  blocks TEXT,
  blocked_by TEXT,
  is_internal INTEGER DEFAULT 0,
  PRIMARY KEY (suite_id, id)
);

CREATE TABLE IF NOT EXISTS project_git_state (
  project_path TEXT PRIMARY KEY,
  branch_count INTEGER,
  stash_count INTEGER,
  dirty_file_count INTEGER,
  uncommitted_changes INTEGER DEFAULT 0,
  current_branch TEXT,
  last_captured TEXT
);

CREATE TABLE IF NOT EXISTS commits (
  hash TEXT PRIMARY KEY,
  project_path TEXT,
  author TEXT,
  date TEXT,
  message TEXT,
  commit_type TEXT,
  commit_scope TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
  display,
  content='history_messages',
  content_rowid='id'
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions(project_path);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_history_messages_session_id ON history_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_history_messages_project_path ON history_messages(project_path);
CREATE INDEX IF NOT EXISTS idx_history_messages_timestamp ON history_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_tasks_suite_id ON tasks(suite_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_commits_project_path ON commits(project_path);
CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date);
`;

export function createSchema(db: Database): void {
  db.exec(SCHEMA_SQL);
}
