-- Organizations + Org membership + invites
CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS org_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','agent','assistant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS org_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','agent','assistant')),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT NULL,
  created_by_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Leads org scoping + assignment
ALTER TABLE leads ADD COLUMN org_id INTEGER;
ALTER TABLE leads ADD COLUMN owner_user_id INTEGER;
ALTER TABLE leads ADD COLUMN assigned_user_id INTEGER;

-- Interactions scoping + author
ALTER TABLE interactions ADD COLUMN org_id INTEGER;
ALTER TABLE interactions ADD COLUMN user_id INTEGER;

-- CRM feature tables org scoping
ALTER TABLE transactions ADD COLUMN org_id INTEGER;
ALTER TABLE seller_profiles ADD COLUMN org_id INTEGER;
ALTER TABLE seller_checklist_items ADD COLUMN org_id INTEGER;
ALTER TABLE rental_deals ADD COLUMN org_id INTEGER;
ALTER TABLE property_management_contracts ADD COLUMN org_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_org_id ON interactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_org_id ON seller_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_seller_checklist_org_id ON seller_checklist_items(org_id);
CREATE INDEX IF NOT EXISTS idx_rental_deals_org_id ON rental_deals(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_contracts_org_id ON property_management_contracts(org_id);
