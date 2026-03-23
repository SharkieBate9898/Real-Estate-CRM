import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "session_token";
const SHORT_SESSION_DAYS = 1;
const LONG_SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type SessionOptions = {
  rememberMe?: boolean;
};

export async function createSession(userId: number, options: SessionOptions = {}) {
  const rememberMe = Boolean(options.rememberMe);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + (rememberMe ? LONG_SESSION_DAYS : SHORT_SESSION_DAYS)
  );

  await db.execute({
    sql: "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
    args: [userId, token, expiresAt.toISOString()],
  });

  const cookieStore = cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  } as const;

  if (rememberMe) {
    cookieStore.set(SESSION_COOKIE, token, {
      ...cookieOptions,
      expires: expiresAt,
    });
  } else {
    cookieStore.set(SESSION_COOKIE, token, cookieOptions);
  }
}

export async function destroySession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.execute({
      sql: "DELETE FROM sessions WHERE token = ?",
      args: [token],
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const result = await db.execute({
    sql: `SELECT users.id, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`,
    args: [token],
  });
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
  };
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  return user;
}

export const sessionCookieName = SESSION_COOKIE;
