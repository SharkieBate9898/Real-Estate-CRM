import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";
import { db } from "@/lib/db";

const schema = z.object({
  lead_type: z
    .enum(["buyer", "seller", "rental", "renter", "buyer_seller"])
    .nullable()
    .optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const nextLeadType = parsed.data.lead_type === "rental" ? "renter" : parsed.data.lead_type ?? null;

  await db.execute({
    sql: "UPDATE leads SET lead_type = ?, updated_at = ? WHERE id = ? AND org_id = ?",
    args: [nextLeadType, new Date().toISOString(), leadId, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
