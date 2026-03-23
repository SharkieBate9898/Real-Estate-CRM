CREATE TABLE IF NOT EXISTS assistant_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  agent_user_id INTEGER NOT NULL,
  assistant_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, agent_user_id, assistant_user_id)
);

CREATE TABLE IF NOT EXISTS assistant_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  agent_user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT NULL,
  created_by_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assistant_links_org_id ON assistant_links(org_id);
CREATE INDEX IF NOT EXISTS idx_assistant_links_agent_id ON assistant_links(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_links_assistant_id ON assistant_links(assistant_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_invites_org_id ON assistant_invites(org_id);
