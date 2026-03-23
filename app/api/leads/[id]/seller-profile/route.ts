import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext, type UserContext } from "@/lib/org";

const createSchema = z.object({});

const defaultChecklist = [
  "CMA completed",
  "Listing paperwork discussed",
  "Photos scheduled",
  "Repairs list created",
  "Staging discussed",
  "Pre-list walk-through completed",
];

async function ensureLead(ctx: UserContext, leadId: number) {
  const access = await canAccessLead(ctx, leadId);
  return Boolean(access);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
  }

  const allowed = await ensureLead(ctx, leadId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const result = await db.execute({
    sql: "SELECT * FROM seller_profiles WHERE org_id = ? AND lead_id = ?",
    args: [ctx.orgId, leadId],
  });

  return NextResponse.json({ ok: true, data: result.rows[0] ?? null });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
  }

  const allowed = await ensureLead(ctx, leadId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT * FROM seller_profiles WHERE org_id = ? AND lead_id = ?",
    args: [ctx.orgId, leadId],
  });
  if (existing.rows[0]) {
    return NextResponse.json({ ok: true, data: existing.rows[0] });
  }

  const now = new Date().toISOString();
  const insertResult = await db.execute({
    sql: `INSERT INTO seller_profiles (user_id, org_id, lead_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
    args: [ctx.userId, ctx.orgId, leadId, now, now],
  });
  const sellerProfileId = Number(insertResult.lastInsertRowid);

  for (const label of defaultChecklist) {
    await db.execute({
      sql: `INSERT INTO seller_checklist_items
        (user_id, org_id, seller_profile_id, label, is_done, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)`,
      args: [ctx.userId, ctx.orgId, sellerProfileId, label, now, now],
    });
  }

  const result = await db.execute({
    sql: "SELECT * FROM seller_profiles WHERE id = ? AND org_id = ?",
    args: [sellerProfileId, ctx.orgId],
  });

  return NextResponse.json({ ok: true, data: result.rows[0] }, { status: 201 });
}
