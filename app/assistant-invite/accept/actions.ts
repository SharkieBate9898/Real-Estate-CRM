"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  acceptAssistantInvite,
  getAssistantInviteByToken,
} from "@/lib/org";
import { createSession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function acceptAssistantInviteAction(formData: FormData) {
  const token = formData.get("token")?.toString();
  if (!token) {
    redirect("/assistant-invite/accept?error=Missing%20invite%20token");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const result = await acceptAssistantInvite({
    token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) {
    redirect(
      `/assistant-invite/accept?token=${token}&error=${encodeURIComponent(result.error)}`
    );
  }

  redirect("/app");
}

const inviteSignupSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function acceptAssistantInviteWithPasswordAction(formData: FormData) {
  const values = inviteSignupSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!values.success) {
    redirect("/assistant-invite/accept?error=Enter%20a%20valid%20email%20and%20password");
  }

  const invite = await getAssistantInviteByToken(values.data.token);
  if (!invite) {
    redirect("/assistant-invite/accept?error=Invite%20not%20found");
  }
  if (invite.email.toLowerCase() !== values.data.email.toLowerCase()) {
    redirect("/assistant-invite/accept?error=Invite%20email%20does%20not%20match");
  }
  if (invite.accepted_at) {
    redirect("/assistant-invite/accept?error=Invite%20already%20accepted");
  }
  if (new Date(invite.expires_at) < new Date()) {
    redirect("/assistant-invite/accept?error=Invite%20expired");
  }

  let userId: number;
  const existing = await db.execute({
    sql: "SELECT id, password_hash FROM users WHERE email = ?",
    args: [values.data.email],
  });

  if (existing.rows[0]) {
    const row = existing.rows[0];
    const existingId = Number(row.id);
    const passwordHash = String(row.password_hash ?? "");
    const valid = await verifyPassword(values.data.password, passwordHash);
    if (!valid) {
      redirect("/assistant-invite/accept?error=Invalid%20password");
    }
    userId = existingId;
  } else {
    const hash = await hashPassword(values.data.password);
    const insert = await db.execute({
      sql: "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      args: [values.data.email, hash],
    });
    userId = Number(insert.lastInsertRowid);
  }

  await createSession(userId);

  const result = await acceptAssistantInvite({
    token: values.data.token,
    userId,
    userEmail: values.data.email,
  });
  if (!result.ok) {
    redirect(
      `/assistant-invite/accept?token=${values.data.token}&error=${encodeURIComponent(
        result.error
      )}`
    );
  }

  redirect("/app");
}
