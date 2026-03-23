import "dotenv/config";
import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));
}

import { db } from "../lib/db";

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const prev = sql[i - 1];

    if (char === "'" && prev !== "\\" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === `"` && prev !== "\\" && !inSingle) {
      inDouble = !inDouble;
    }

    if (char === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

async function migrate() {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSqlStatements(schema);

  for (const statement of statements) {
    await db.execute({ sql: statement, args: [] });
  }

  console.log(`Migration complete. Applied ${statements.length} statements.`);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
