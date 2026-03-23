import "server-only";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type UserRole = "admin" | "manager" | "user";

const allowedRoles = new Set<UserRole>(["admin", "manager", "user"]);

function normalizeRole(role: unknown): UserRole {
  if (typeof role === "string") {
    const lowered = role.toLowerCase();
    if (allowedRoles.has(lowered as UserRole)) {
      return lowered as UserRole;
    }
  }
  return "user";
}

export type CurrentUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const result = await db.execute({
    sql: "SELECT id, email, NULL as name, role FROM users WHERE id = ? LIMIT 1",
    args: [session.id],
  });

  const row = result.rows[0] as unknown as
    | { id: number; email: string; name: string | null; role: string | null }
    | undefined;

  if (!row) return null;

  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
    name: row.name ? String(row.name) : null,
    role: normalizeRole(row.role),
  };
}
