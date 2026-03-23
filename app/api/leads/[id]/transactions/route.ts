import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext, type UserContext } from "@/lib/org";
import { calcSaleGross, calcSaleNet } from "@/lib/calcs";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const transactionSchema = z.object({
  type: z.enum(["buyer_sale", "seller_sale"]),
  status: z.enum(["pending", "under_contract", "closed", "lost"]),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  purchase_price: numberField.optional(),
  commission_percent: numberField.optional(),
  broker_split_percent: numberField.optional(),
  referral_fee_percent: numberField.optional(),
  closing_date: z.string().optional().nullable(),
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
    sql: "SELECT * FROM transactions WHERE org_id = ? AND lead_id = ? ORDER BY created_at DESC",
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
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const gross = calcSaleGross(parsed.data.purchase_price, parsed.data.commission_percent);
  const net = calcSaleNet(gross, parsed.data.broker_split_percent, parsed.data.referral_fee_percent);

  const result = await db.execute({
    sql: `INSERT INTO transactions
      (user_id, org_id, lead_id, type, status, address, city, state, zip, purchase_price,
       commission_percent, broker_split_percent, referral_fee_percent,
       est_gross_commission, est_net_commission, closing_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      ctx.userId,
      ctx.orgId,
      leadId,
      parsed.data.type,
      parsed.data.status,
      parsed.data.address ?? null,
      parsed.data.city ?? null,
      parsed.data.state ?? null,
      parsed.data.zip ?? null,
      parsed.data.purchase_price ?? null,
      parsed.data.commission_percent ?? null,
      parsed.data.broker_split_percent ?? null,
      parsed.data.referral_fee_percent ?? null,
      gross || null,
      net || null,
      parsed.data.closing_date ?? null,
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
