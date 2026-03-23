import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext, type UserContext } from "@/lib/org";
import { calcRentalCommission } from "@/lib/calcs";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const rentalSchema = z.object({
  role: z.enum(["tenant_rep", "landlord_rep"]),
  property_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  monthly_rent: numberField.optional(),
  lease_term_months: numberField.optional(),
  move_in_date: z.string().optional().nullable(),
  fee_type: z.enum(["one_month", "percent", "flat"]).optional().nullable(),
  fee_value: numberField.optional(),
  status: z.enum(["pending", "placed", "lost"]),
  notes: z.string().optional().nullable(),
});

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
    sql: "SELECT * FROM rental_deals WHERE org_id = ? AND lead_id = ? ORDER BY created_at DESC",
    args: [ctx.orgId, leadId],
  });

  return NextResponse.json({ ok: true, data: result.rows });
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
  const parsed = rentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const est = calcRentalCommission(
    parsed.data.monthly_rent ?? null,
    parsed.data.fee_type ?? null,
    parsed.data.fee_value ?? null
  );
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: `INSERT INTO rental_deals
      (user_id, org_id, lead_id, role, property_address, city, state, zip, monthly_rent,
       lease_term_months, move_in_date, fee_type, fee_value, est_commission,
       status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      ctx.userId,
      ctx.orgId,
      leadId,
      parsed.data.role,
      parsed.data.property_address ?? null,
      parsed.data.city ?? null,
      parsed.data.state ?? null,
      parsed.data.zip ?? null,
      parsed.data.monthly_rent ?? null,
      parsed.data.lease_term_months ?? null,
      parsed.data.move_in_date ?? null,
      parsed.data.fee_type ?? null,
      parsed.data.fee_value ?? null,
      est || null,
      parsed.data.status,
      parsed.data.notes ?? null,
      now,
      now,
    ],
  });

  return NextResponse.json(
    { ok: true, data: { id: Number(result.lastInsertRowid) } },
    { status: 201 }
  );
}
