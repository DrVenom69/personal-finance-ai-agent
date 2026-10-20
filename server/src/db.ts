import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || 'proact.db';
export const db = new DatabaseSync(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL DEFAULT 'device',
  external_id TEXT,
  token TEXT,
  currency TEXT DEFAULT '¥',
  monthly_income REAL DEFAULT 0,
  spending_style TEXT DEFAULT 'Balanced',
  savings_goal REAL DEFAULT 0,
  savings_pot REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT,
  amount REAL,
  frequency TEXT DEFAULT 'Monthly',
  due_day INTEGER DEFAULT 1,
  category TEXT DEFAULT 'Other',
  is_protected INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT,
  merchant TEXT,
  amount REAL,
  category TEXT,
  source TEXT,
  confidence TEXT,
  merged_with TEXT,
  needs_review INTEGER DEFAULT 0,
  is_flagged INTEGER DEFAULT 0,
  raw_text TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT,
  user_id TEXT NOT NULL,
  timestamp TEXT,
  action TEXT,
  tier TEXT,
  rule_used TEXT,
  result TEXT,
  hash TEXT,
  prev_hash TEXT,
  details TEXT
);
`);
