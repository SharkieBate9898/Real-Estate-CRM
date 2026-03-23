import { createClient } from "@libsql/client/web";
import { type LeadStage, leadStages } from "@/lib/leadStages";

console.log("[db] CWD =", process.cwd());
console.log("[db] TURSO_DATABASE_URL =", process.env.TURSO_DATABASE_URL);

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://dummy-url-for-build.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "dummy-token",
});

export { leadStages };
export type { LeadStage };

export const interactionTypes = [
  "call",
  "text",
  "email",
  "dm",
  "tour",
  "note",
] as const;

export type InteractionType = (typeof interactionTypes)[number];
