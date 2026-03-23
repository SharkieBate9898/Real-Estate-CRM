import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";
import { calcSaleGross, calcSaleNet } from "@/lib/calcs";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const updateSchema = z.object({
  type: z.enum(["buyer_sale", "seller_sale"]).optional(),
  status: z.enum(["pending", "under_contract", "closed", "lost"]).optional(),
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid transaction id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT * FROM transactions WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }
  const leadId = Number(existing.lead_id);
  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const merged = {
    purchase_price:
      parsed.data.purchase_price !== undefined
        ? parsed.data.purchase_price
        : (existing.purchase_price as number | null | undefined),
    commission_percent:
      parsed.data.commission_percent !== undefined
        ? parsed.data.commission_percent
        : (existing.commission_percent as number | null | undefined),
    broker_split_percent:
      parsed.data.broker_split_percent !== undefined
        ? parsed.data.broker_split_percent
        : (existing.broker_split_percent as number | null | undefined),
    referral_fee_percent:
      parsed.data.referral_fee_percent !== undefined
        ? parsed.data.referral_fee_percent
        : (existing.referral_fee_percent as number | null | undefined),
  };

  const gross = calcSaleGross(merged.purchase_price, merged.commission_percent);
  const net = calcSaleNet(gross, merged.broker_split_percent, merged.referral_fee_percent);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  });

  fields.push("est_gross_commission = ?", "est_net_commission = ?", "updated_at = ?");
  values.push(gross || null, net || null, new Date().toISOString());

  await db.execute({
    sql: `UPDATE transactions SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
    args: [...values, id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid transaction id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT lead_id FROM transactions WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as unknown as { lead_id: number } | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(existing.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }

  await db.execute({
    sql: "DELETE FROM transactions WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
