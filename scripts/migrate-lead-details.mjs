import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const columns = [
  { name: "price_min", type: "INTEGER" },
  { name: "price_max", type: "INTEGER" },
  { name: "has_kids", type: "INTEGER" },
  { name: "vehicle", type: "TEXT" },
  { name: "lead_type", type: "TEXT" },
  { name: "timeline", type: "TEXT" },
  { name: "preapproved", type: "INTEGER" },
  { name: "lender_name", type: "TEXT" },
  { name: "down_payment_range", type: "TEXT" },
  { name: "credit_confidence", type: "TEXT" },
  { name: "bedrooms_min", type: "INTEGER" },
  { name: "bathrooms_min", type: "INTEGER" },
  { name: "property_type", type: "TEXT" },
  { name: "preferred_areas", type: "TEXT" },
  { name: "school_priority", type: "TEXT" },
  { name: "commute_city", type: "TEXT" },
  { name: "commute_max_min", type: "INTEGER" },
  { name: "work_from_home", type: "TEXT" },
  { name: "pets", type: "TEXT" },
  { name: "important_notes", type: "TEXT" },
];

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("Missing TURSO_DATABASE_URL");
  }

  const info = await db.execute({ sql: "PRAGMA table_info(leads)" });
  const existing = new Set(info.rows.map((row) => String(row.name)));

  for (const column of columns) {
    if (existing.has(column.name)) {
      console.log(`[skip] ${column.name} already exists`);
      continue;
    }
    const sql = `ALTER TABLE leads ADD COLUMN ${column.name} ${column.type}`;
    console.log(`[add] ${sql}`);
    await db.execute({ sql });
  }

  console.log("Lead details migration complete.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.close());
