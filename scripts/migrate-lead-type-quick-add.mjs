import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("Missing TURSO_DATABASE_URL");
  }

  const info = await db.execute({ sql: "PRAGMA table_info(leads)" });
  const existing = new Set(info.rows.map((row) => String(row.name)));

  if (!existing.has("lead_type")) {
    const sql = "ALTER TABLE leads ADD COLUMN lead_type TEXT";
    console.log(`[add] ${sql}`);
    await db.execute({ sql });
  } else {
    console.log("[skip] lead_type already exists");
  }

  console.log("Lead type migration complete.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.close());
