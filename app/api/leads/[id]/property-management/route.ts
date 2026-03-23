import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext, type UserContext } from "@/lib/org";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const pmSchema = z.object({
  property_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  monthly_rent: numberField.optional(),
  management_percent: numberField.optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["active", "ended"]),
});

async function ensureLead(ctx: UserContext, leadId: number) {
  const access = await canAccessLead(ctx, leadId);
  return Boolean(access);
}

function calcMonthlyManagementFee(monthlyRent?: number | null, managementPercent?: number | null) {
  if (!monthlyRent || !managementPercent) return 0;
  return (monthlyRent * managementPercent) / 100;
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
    sql: `SELECT * FROM property_management_contracts
      WHERE org_id = ? AND lead_id = ?
      ORDER BY created_at DESC`,
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
  const parsed = pmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const fee = calcMonthlyManagementFee(parsed.data.monthly_rent, parsed.data.management_percent);
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: `INSERT INTO property_management_contracts
      (user_id, org_id, lead_id, property_address, city, state, zip, monthly_rent,
       management_percent, monthly_management_fee, start_date, end_date,
       status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      ctx.userId,
      ctx.orgId,
      leadId,
      parsed.data.property_address ?? null,
      parsed.data.city ?? null,
      parsed.data.state ?? null,
      parsed.data.zip ?? null,
      parsed.data.monthly_rent ?? null,
      parsed.data.management_percent ?? null,
      fee || null,
      parsed.data.start_date ?? null,
      parsed.data.end_date ?? null,
      parsed.data.status,
      now,
      now,
    ],
  });

  return NextResponse.json(
    { ok: true, data: { id: Number(result.lastInsertRowid) } },
    { status: 201 }
  );
}
