"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  mode: z.enum(["login", "signup"]),
});

type AuthState = { error?: string };

export async function handleAuth(
  _prevState: AuthState | void,
  formData: FormData
): Promise<AuthState> {
  const values = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    mode: formData.get("mode"),
  });

  if (!values.success) {
    return { error: "Please enter a valid email and password (min 6 chars)." };
  }

  const { email, password, mode } = values.data;
  const rememberMe = formData.get("rememberMe") === "on";

  if (mode === "signup") {
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existing.rows[0]) {
      return { error: "Account already exists. Please log in." };
    }

    const hash = await hashPassword(password);
    const result = await db.execute({
      sql: "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      args: [email, hash],
    });

    await createSession(Number(result.lastInsertRowid), { rememberMe });
    redirect("/app");
  }

  const userResult = await db.execute({
    sql: "SELECT id, password_hash FROM users WHERE email = ?",
    args: [email],
  });
  const row = userResult.rows[0];

  if (!row) return { error: "Invalid email or password." };

  const userId = Number(row.id);
  const passwordHash = String(row.password_hash ?? "");
  const valid = await verifyPassword(password, passwordHash);
  if (!valid) return { error: "Invalid email or password." };

  await createSession(userId, { rememberMe });
  redirect("/app");
}
