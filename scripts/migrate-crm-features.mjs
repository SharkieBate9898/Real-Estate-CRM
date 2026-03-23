import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const leadColumns = [
  { name: "source_detail", type: "TEXT" },
  { name: "source_first_touch_at", type: "TEXT" },
];

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lead_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    purchase_price INTEGER,
    commission_percent REAL,
    broker_split_percent REAL,
    referral_fee_percent REAL,
    est_gross_commission REAL,
    est_net_commission REAL,
    closing_date TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS seller_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lead_id INTEGER NOT NULL UNIQUE,
    property_address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    estimated_value INTEGER,
    mortgage_balance INTEGER,
    motivation_level INTEGER,
    condition_score INTEGER,
    listing_readiness TEXT,
    target_list_date TEXT,
    has_hoa INTEGER,
    hoa_notes TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS seller_checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    seller_profile_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    is_done INTEGER NOT NULL,
    due_date TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS rental_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lead_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    property_address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    monthly_rent INTEGER,
    lease_term_months INTEGER,
    move_in_date TEXT,
    fee_type TEXT,
    fee_value REAL,
    est_commission REAL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS property_management_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lead_id INTEGER NOT NULL,
    property_address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    monthly_rent INTEGER,
    management_percent REAL,
    monthly_management_fee REAL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_lead_id ON transactions(lead_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_profiles_lead_id ON seller_profiles(lead_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_checklist_user_id ON seller_checklist_items(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_seller_checklist_profile_id ON seller_checklist_items(seller_profile_id)",
  "CREATE INDEX IF NOT EXISTS idx_rental_deals_user_id ON rental_deals(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_rental_deals_lead_id ON rental_deals(lead_id)",
  "CREATE INDEX IF NOT EXISTS idx_pm_contracts_user_id ON property_management_contracts(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_pm_contracts_lead_id ON property_management_contracts(lead_id)",
];

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("Missing TURSO_DATABASE_URL");
  }

  const info = await db.execute({ sql: "PRAGMA table_info(leads)" });
  const existing = new Set(info.rows.map((row) => String(row.name)));

  for (const column of leadColumns) {
    if (existing.has(column.name)) {
      console.log(`[skip] ${column.name} already exists`);
      continue;
    }
    const sql = `ALTER TABLE leads ADD COLUMN ${column.name} ${column.type}`;
    console.log(`[add] ${sql}`);
    await db.execute({ sql });
  }

  for (const sql of tableStatements) {
    await db.execute({ sql });
  }

  console.log("CRM features migration complete.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.close());
