import crypto from "crypto";
import "server-only";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type OrgRole = "admin" | "agent" | "assistant";
export type OrgStatus = "active" | "invited" | "disabled";

export type UserContext = {
  userId: number;
  email: string;
  orgId: number;
  role: OrgRole;
};

export type OrgSummary = {
  id: number;
  name: string;
  created_at: string;
};

export type OrgMember = {
  id: number;
  org_id: number;
  user_id: number;
  role: OrgRole;
  status: OrgStatus;
  created_at: string;
  email: string;
};

export type OrgInvite = {
  id: number;
  org_id: number;
  email: string;
  role: OrgRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by_user_id: number;
  created_at: string;
};

export type AssistantInvite = {
  id: number;
  org_id: number;
  agent_user_id: number;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by_user_id: number;
  created_at: string;
};

export type AssistantLink = {
  id: number;
  org_id: number;
  agent_user_id: number;
  assistant_user_id: number;
  created_at: string;
  agent_email: string;
  assistant_email: string;
};

function buildDefaultOrgName(email: string) {
  const local = email.split("@")[0]?.trim();
  if (!local) return "My Brokerage";
  return `${local} Brokerage`;
}

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const membershipResult = await db.execute({
    sql: `SELECT org_id, role
       FROM org_members
       WHERE user_id = ? AND status = 'active'
       ORDER BY id ASC
       LIMIT 1`,
    args: [user.id],
  });

  if (membershipResult.rows.length > 0) {
    const membership = membershipResult.rows[0] as unknown as {
      org_id: number;
      role: OrgRole;
    };
    return {
      userId: user.id,
      email: user.email,
      orgId: Number(membership.org_id),
      role: membership.role,
    };
  }

  const orgName = buildDefaultOrgName(user.email);
  const orgResult = await db.execute({
    sql: "INSERT INTO orgs (name, created_at) VALUES (?, ?)",
    args: [orgName, new Date().toISOString()],
  });
  const orgId = Number(orgResult.lastInsertRowid);

  await db.execute({
    sql: `INSERT INTO org_members (org_id, user_id, role, status, created_at)
      VALUES (?, ?, 'admin', 'active', ?)`,
    args: [orgId, user.id, new Date().toISOString()],
  });

  return {
    userId: user.id,
    email: user.email,
    orgId,
    role: "admin",
  };
}

export function requireRole(ctx: UserContext, allowed: OrgRole[]) {
  if (!allowed.includes(ctx.role)) {
    throw new Error("Forbidden");
  }
}

export function generateInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function getOrg(orgId: number) {
  const result = await db.execute({
    sql: "SELECT * FROM orgs WHERE id = ?",
    args: [orgId],
  });
  return (result.rows[0] as unknown as OrgSummary | undefined) ?? null;
}

export async function listOrgMembers(orgId: number) {
  const result = await db.execute({
    sql: `SELECT org_members.*, users.email
      FROM org_members
      JOIN users ON users.id = org_members.user_id
      WHERE org_members.org_id = ?
      ORDER BY org_members.created_at ASC`,
    args: [orgId],
  });
  return result.rows as unknown as OrgMember[];
}

export async function getOrgMember(orgId: number, memberId: number) {
  const result = await db.execute({
    sql: `SELECT org_members.*, users.email
      FROM org_members
      JOIN users ON users.id = org_members.user_id
      WHERE org_members.org_id = ? AND org_members.id = ?`,
    args: [orgId, memberId],
  });
  return (result.rows[0] as unknown as OrgMember | undefined) ?? null;
}

export async function listOrgMembersByRole(orgId: number, roles: OrgRole[]) {
  const placeholders = roles.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT org_members.*, users.email
      FROM org_members
      JOIN users ON users.id = org_members.user_id
      WHERE org_members.org_id = ? AND org_members.role IN (${placeholders})
      ORDER BY org_members.created_at ASC`,
    args: [orgId, ...roles],
  });
  return result.rows as unknown as OrgMember[];
}

export async function listOrgInvites(orgId: number) {
  const result = await db.execute({
    sql: `SELECT * FROM org_invites
      WHERE org_id = ?
      ORDER BY created_at DESC`,
    args: [orgId],
  });
  return result.rows as unknown as OrgInvite[];
}

export async function createOrgInvite(params: {
  orgId: number;
  email: string;
  role: OrgRole;
  createdByUserId: number;
}) {
  const token = generateInviteToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  await db.execute({
    sql: `INSERT INTO org_invites
      (org_id, email, role, token, expires_at, created_by_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.orgId,
      params.email,
      params.role,
      token,
      expires.toISOString(),
      params.createdByUserId,
      new Date().toISOString(),
    ],
  });
  return token;
}

export async function getInviteByToken(token: string) {
  const result = await db.execute({
    sql: `SELECT org_invites.*, orgs.name as org_name
      FROM org_invites
      JOIN orgs ON orgs.id = org_invites.org_id
      WHERE org_invites.token = ?`,
    args: [token],
  });
  return (
    (result.rows[0] as unknown as (OrgInvite & { org_name: string }) | undefined) ?? null
  );
}

export async function createAssistantInvite(params: {
  orgId: number;
  agentUserId: number;
  email: string;
  createdByUserId: number;
}) {
  const token = generateInviteToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  await db.execute({
    sql: `INSERT INTO assistant_invites
      (org_id, agent_user_id, email, token, expires_at, created_by_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.orgId,
      params.agentUserId,
      params.email,
      token,
      expires.toISOString(),
      params.createdByUserId,
      new Date().toISOString(),
    ],
  });
  return token;
}

export async function getAssistantInviteByToken(token: string) {
  const result = await db.execute({
    sql: `SELECT assistant_invites.*, orgs.name as org_name, users.email as agent_email
      FROM assistant_invites
      JOIN orgs ON orgs.id = assistant_invites.org_id
      JOIN users ON users.id = assistant_invites.agent_user_id
      WHERE assistant_invites.token = ?`,
    args: [token],
  });
  return (
    (result.rows[0] as unknown as
      | (AssistantInvite & { org_name: string; agent_email: string })
      | undefined) ?? null
  );
}

export async function acceptAssistantInvite(params: {
  token: string;
  userId: number;
  userEmail: string;
}) {
  const invite = await getAssistantInviteByToken(params.token);
  if (!invite) {
    return { ok: false as const, error: "Invite not found" };
  }
  if (invite.accepted_at) {
    return { ok: false as const, error: "Invite already accepted" };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false as const, error: "Invite expired" };
  }
  if (invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    return { ok: false as const, error: "Invite email does not match your account" };
  }

  const membership = await db.execute({
    sql: "SELECT id, role FROM org_members WHERE org_id = ? AND user_id = ?",
    args: [invite.org_id, params.userId],
  });
  if (!membership.rows[0]) {
    await db.execute({
      sql: `INSERT INTO org_members (org_id, user_id, role, status, created_at)
        VALUES (?, ?, 'assistant', 'active', ?)`,
      args: [invite.org_id, params.userId, new Date().toISOString()],
    });
  }

  await db.execute({
    sql: `INSERT OR IGNORE INTO assistant_links
      (org_id, agent_user_id, assistant_user_id, created_at)
      VALUES (?, ?, ?, ?)`,
    args: [
      invite.org_id,
      invite.agent_user_id,
      params.userId,
      new Date().toISOString(),
    ],
  });

  await db.execute({
    sql: "UPDATE assistant_invites SET accepted_at = ? WHERE id = ?",
    args: [new Date().toISOString(), invite.id],
  });

  return { ok: true as const, orgId: Number(invite.org_id) };
}

export async function listAssistantLinks(orgId: number, agentUserId?: number) {
  const args: (string | number)[] = [orgId];
  let where = "assistant_links.org_id = ?";
  if (agentUserId) {
    where += " AND assistant_links.agent_user_id = ?";
    args.push(agentUserId);
  }
  const result = await db.execute({
    sql: `SELECT assistant_links.*, agents.email as agent_email, assistants.email as assistant_email
      FROM assistant_links
      JOIN users as agents ON agents.id = assistant_links.agent_user_id
      JOIN users as assistants ON assistants.id = assistant_links.assistant_user_id
      WHERE ${where}
      ORDER BY assistant_links.created_at DESC`,
    args,
  });
  return result.rows as unknown as AssistantLink[];
}

export async function listAssistantInvites(orgId: number, agentUserId?: number) {
  const args: (string | number)[] = [orgId];
  let where = "assistant_invites.org_id = ?";
  if (agentUserId) {
    where += " AND assistant_invites.agent_user_id = ?";
    args.push(agentUserId);
  }
  const result = await db.execute({
    sql: `SELECT assistant_invites.*, users.email as agent_email
      FROM assistant_invites
      JOIN users ON users.id = assistant_invites.agent_user_id
      WHERE ${where}
      ORDER BY assistant_invites.created_at DESC`,
    args,
  });
  return result.rows as unknown as (AssistantInvite & { agent_email: string })[];
}

export async function deleteAssistantLink(
  orgId: number,
  linkId: number,
  agentUserId?: number
) {
  if (agentUserId) {
    await db.execute({
      sql: "DELETE FROM assistant_links WHERE id = ? AND org_id = ? AND agent_user_id = ?",
      args: [linkId, orgId, agentUserId],
    });
    return;
  }
  await db.execute({
    sql: "DELETE FROM assistant_links WHERE id = ? AND org_id = ?",
    args: [linkId, orgId],
  });
}

export async function listAssistantAgentIds(orgId: number, assistantUserId: number) {
  const result = await db.execute({
    sql: `SELECT agent_user_id
      FROM assistant_links
      WHERE org_id = ? AND assistant_user_id = ?`,
    args: [orgId, assistantUserId],
  });
  return result.rows.map((row) => Number(row.agent_user_id));
}

export async function getVisibleOwnerIds(ctx: UserContext) {
  if (ctx.role === "admin") return null;
  if (ctx.role === "agent") return [ctx.userId];
  const agentIds = await listAssistantAgentIds(ctx.orgId, ctx.userId);
  return [ctx.userId, ...agentIds];
}

export async function canAccessLead(ctx: UserContext, leadId: number) {
  const ownerIds = await getVisibleOwnerIds(ctx);
  if (!ownerIds) {
    const result = await db.execute({
      sql: "SELECT id, owner_user_id FROM leads WHERE id = ? AND org_id = ?",
      args: [leadId, ctx.orgId],
    });
    return (result.rows[0] as unknown as { id: number; owner_user_id: number } | undefined) ?? null;
  }
  const placeholders = ownerIds.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT id, owner_user_id
      FROM leads
      WHERE id = ? AND org_id = ? AND owner_user_id IN (${placeholders})`,
    args: [leadId, ctx.orgId, ...ownerIds],
  });
  return (result.rows[0] as unknown as { id: number; owner_user_id: number } | undefined) ?? null;
}

export async function acceptOrgInvite(params: {
  token: string;
  userId: number;
  userEmail: string;
}) {
  const inviteResult = await db.execute({
    sql: "SELECT * FROM org_invites WHERE token = ?",
    args: [params.token],
  });
  const invite = inviteResult.rows[0] as unknown as OrgInvite | undefined;
  if (!invite) {
    return { ok: false as const, error: "Invite not found" };
  }
  if (invite.accepted_at) {
    return { ok: false as const, error: "Invite already accepted" };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false as const, error: "Invite expired" };
  }
  if (invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    return { ok: false as const, error: "Invite email does not match your account" };
  }

  await db.execute({
    sql: `INSERT OR IGNORE INTO org_members (org_id, user_id, role, status, created_at)
      VALUES (?, ?, ?, 'active', ?)`,
    args: [invite.org_id, params.userId, invite.role, new Date().toISOString()],
  });

  await db.execute({
    sql: "UPDATE org_invites SET accepted_at = ? WHERE id = ?",
    args: [new Date().toISOString(), invite.id],
  });

  return { ok: true as const, orgId: Number(invite.org_id) };
}

export async function updateOrgMemberRole(orgId: number, memberId: number, role: OrgRole) {
  await db.execute({
    sql: "UPDATE org_members SET role = ? WHERE id = ? AND org_id = ?",
    args: [role, memberId, orgId],
  });
}

export async function updateOrgMemberStatus(
  orgId: number,
  memberId: number,
  status: OrgStatus
) {
  await db.execute({
    sql: "UPDATE org_members SET status = ? WHERE id = ? AND org_id = ?",
    args: [status, memberId, orgId],
  });
}

export async function updateOrgName(orgId: number, name: string) {
  await db.execute({
    sql: "UPDATE orgs SET name = ? WHERE id = ?",
    args: [name, orgId],
  });
}
