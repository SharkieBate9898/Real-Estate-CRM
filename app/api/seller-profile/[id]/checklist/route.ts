import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";

const createSchema = z.object({
  label: z.string().min(1),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfileId = Number(params.id);
  if (!Number.isFinite(sellerProfileId)) {
    return NextResponse.json({ ok: false, error: "Invalid seller profile id" }, { status: 400 });
  }

  const profileResult = await db.execute({
    sql: "SELECT lead_id FROM seller_profiles WHERE id = ? AND org_id = ?",
    args: [sellerProfileId, ctx.orgId],
  });
  const profile = profileResult.rows[0] as unknown as { lead_id: number } | undefined;
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(profile.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }

  const result = await db.execute({
    sql: `SELECT * FROM seller_checklist_items
      WHERE org_id = ? AND seller_profile_id = ?
      ORDER BY created_at ASC`,
    args: [ctx.orgId, sellerProfileId],
  });

  return NextResponse.json({ ok: true, data: result.rows });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfileId = Number(params.id);
  if (!Number.isFinite(sellerProfileId)) {
    return NextResponse.json({ ok: false, error: "Invalid seller profile id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const profileResult = await db.execute({
    sql: "SELECT lead_id FROM seller_profiles WHERE id = ? AND org_id = ?",
    args: [sellerProfileId, ctx.orgId],
  });
  const profile = profileResult.rows[0] as unknown as { lead_id: number } | undefined;
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(profile.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const insert = await db.execute({
    sql: `INSERT INTO seller_checklist_items
      (user_id, org_id, seller_profile_id, label, is_done, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)`,
    args: [ctx.userId, ctx.orgId, sellerProfileId, parsed.data.label, now, now],
  });

  return NextResponse.json(
    { ok: true, data: { id: Number(insert.lastInsertRowid) } },
    { status: 201 }
  );
}
