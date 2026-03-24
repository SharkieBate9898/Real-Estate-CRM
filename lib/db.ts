import { createClient } from "@libsql/client";
import { type LeadStage, leadStages } from "@/lib/leadStages";

console.log("[db] CWD =", process.cwd());
console.log("[db] TURSO_DATABASE_URL =", process.env.TURSO_DATABASE_URL);

const customFetch = async (...args: Parameters<typeof fetch>) => {
  const response = await fetch(...args);
  if (response.body && typeof response.body.cancel !== "function") {
    response.body.cancel = async () => {};
  }
  return response;
};

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://dummy-url-for-build.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "dummy-token",
  fetch: customFetch,
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
