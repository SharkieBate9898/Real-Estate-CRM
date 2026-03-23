import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const columns = [
  { name: "doc_preapproval_received", type: "INTEGER DEFAULT 0" },
  { name: "doc_proof_of_funds_received", type: "INTEGER DEFAULT 0" },
  { name: "doc_buyer_agency_signed", type: "INTEGER DEFAULT 0" },
  { name: "doc_listing_agreement_signed", type: "INTEGER DEFAULT 0" },
  { name: "doc_property_disclosures_received", type: "INTEGER DEFAULT 0" },
  { name: "doc_hoa_docs_received", type: "INTEGER DEFAULT 0" },
  { name: "doc_notes", type: "TEXT" },
  { name: "rent_min", type: "INTEGER" },
  { name: "rent_max", type: "INTEGER" },
  { name: "lease_start_date", type: "TEXT" },
  { name: "pets_allowed", type: "INTEGER DEFAULT 0" },
  { name: "application_submitted", type: "INTEGER DEFAULT 0" },
  { name: "landlord_contact_name", type: "TEXT" },
  { name: "landlord_contact_phone", type: "TEXT" },
  { name: "landlord_contact_email", type: "TEXT" },
  { name: "rental_notes", type: "TEXT" },
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

  console.log("Document + rental fields migration complete.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.close());
