import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const tableColumns = {
  leads: [
    { name: "org_id", type: "INTEGER" },
    { name: "owner_user_id", type: "INTEGER" },
    { name: "assigned_user_id", type: "INTEGER" },
  ],
  interactions: [
    { name: "org_id", type: "INTEGER" },
    { name: "user_id", type: "INTEGER" },
  ],
  transactions: [{ name: "org_id", type: "INTEGER" }],
  seller_profiles: [{ name: "org_id", type: "INTEGER" }],
  seller_checklist_items: [{ name: "org_id", type: "INTEGER" }],
  rental_deals: [{ name: "org_id", type: "INTEGER" }],
  property_management_contracts: [{ name: "org_id", type: "INTEGER" }],
};

const orgTables = [
  `CREATE TABLE IF NOT EXISTS orgs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS org_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','agent','assistant')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(org_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS org_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','agent','assistant')),
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    accepted_at TEXT NULL,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS assistant_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    agent_user_id INTEGER NOT NULL,
    assistant_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(org_id, agent_user_id, assistant_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS assistant_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    agent_user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    accepted_at TEXT NULL,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_assistant_links_org_id ON assistant_links(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_assistant_links_agent_id ON assistant_links(agent_user_id)",
  "CREATE INDEX IF NOT EXISTS idx_assistant_links_assistant_id ON assistant_links(assistant_user_id)",
  "CREATE INDEX IF NOT EXISTS idx_assistant_invites_org_id ON assistant_invites(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id)",
  "CREATE INDEX IF NOT EXISTS idx_interactions_org_id ON interactions(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_profiles_org_id ON seller_profiles(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_checklist_org_id ON seller_checklist_items(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_rental_deals_org_id ON rental_deals(org_id)",
  "CREATE INDEX IF NOT EXISTS idx_pm_contracts_org_id ON property_management_contracts(org_id)",
];

async function tableExists(tableName) {
  const result = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [tableName],
  });
  return result.rows.length > 0;
}

async function ensureColumns(tableName, columns) {
  if (!(await tableExists(tableName))) {
    return;
  }
  const info = await db.execute({ sql: `PRAGMA table_info(${tableName})` });
  const existing = new Set(info.rows.map((row) => String(row.name)));
  for (const column of columns) {
    if (existing.has(column.name)) {
      console.log(`[skip] ${tableName}.${column.name} already exists`);
      continue;
    }
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`;
    console.log(`[add] ${sql}`);
    await db.execute({ sql });
  }
}

function defaultOrgName(email) {
  const local = (email || "").split("@")[0]?.trim();
  return local ? `${local} Brokerage` : "My Brokerage";
}

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("Missing TURSO_DATABASE_URL");
  }

  for (const sql of orgTables) {
    await db.execute({ sql });
  }

  for (const [tableName, columns] of Object.entries(tableColumns)) {
    await ensureColumns(tableName, columns);
  }

  for (const sql of indexes) {
    await db.execute({ sql });
  }

  const users = await db.execute({ sql: "SELECT id, email FROM users" });
  for (const row of users.rows) {
    const userId = Number(row.id);
    const email = String(row.email ?? "");
    const membership = await db.execute({
      sql: "SELECT org_id FROM org_members WHERE user_id = ? LIMIT 1",
      args: [userId],
    });

    let orgId;
    if (membership.rows.length > 0) {
      orgId = Number(membership.rows[0].org_id);
    } else {
      const orgResult = await db.execute({
        sql: "INSERT INTO orgs (name, created_at) VALUES (?, ?)",
        args: [defaultOrgName(email), new Date().toISOString()],
      });
      orgId = Number(orgResult.lastInsertRowid);
      await db.execute({
        sql: `INSERT INTO org_members (org_id, user_id, role, status, created_at)
          VALUES (?, ?, 'admin', 'active', ?)`,
        args: [orgId, userId, new Date().toISOString()],
      });
    }

    if (await tableExists("leads")) {
      await db.execute({
        sql: `UPDATE leads
          SET org_id = ?, owner_user_id = COALESCE(owner_user_id, user_id)
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
    if (await tableExists("transactions")) {
      await db.execute({
        sql: `UPDATE transactions
          SET org_id = ?
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
    if (await tableExists("seller_profiles")) {
      await db.execute({
        sql: `UPDATE seller_profiles
          SET org_id = ?
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
    if (await tableExists("seller_checklist_items")) {
      await db.execute({
        sql: `UPDATE seller_checklist_items
          SET org_id = ?
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
    if (await tableExists("rental_deals")) {
      await db.execute({
        sql: `UPDATE rental_deals
          SET org_id = ?
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
    if (await tableExists("property_management_contracts")) {
      await db.execute({
        sql: `UPDATE property_management_contracts
          SET org_id = ?
          WHERE user_id = ? AND (org_id IS NULL OR org_id = '')`,
        args: [orgId, userId],
      });
    }
  }

  if (await tableExists("interactions")) {
    await db.execute({
      sql: `UPDATE interactions
        SET org_id = (SELECT org_id FROM leads WHERE leads.id = interactions.lead_id)
        WHERE org_id IS NULL OR org_id = ''`,
    });
    await db.execute({
      sql: `UPDATE interactions
        SET user_id = (SELECT COALESCE(owner_user_id, user_id) FROM leads WHERE leads.id = interactions.lead_id)
        WHERE user_id IS NULL OR user_id = ''`,
    });
  }

  console.log("Org migration + backfill complete.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.close());
