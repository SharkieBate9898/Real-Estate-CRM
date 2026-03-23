import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";
import { calcRentalCommission } from "@/lib/calcs";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const updateSchema = z.object({
  role: z.enum(["tenant_rep", "landlord_rep"]).optional(),
  property_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  monthly_rent: numberField.optional(),
  lease_term_months: numberField.optional(),
  move_in_date: z.string().optional().nullable(),
  fee_type: z.enum(["one_month", "percent", "flat"]).optional().nullable(),
  fee_value: numberField.optional(),
  status: z.enum(["pending", "placed", "lost"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid rental id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT * FROM rental_deals WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Rental deal not found" }, { status: 404 });
  }
  const leadId = Number(existing.lead_id);
  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    return NextResponse.json({ ok: false, error: "Rental deal not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const merged = {
    monthly_rent:
      parsed.data.monthly_rent !== undefined
        ? parsed.data.monthly_rent
        : (existing.monthly_rent as number | null | undefined),
    fee_type:
      parsed.data.fee_type !== undefined
        ? parsed.data.fee_type
        : (existing.fee_type as string | null | undefined),
    fee_value:
      parsed.data.fee_value !== undefined
        ? parsed.data.fee_value
        : (existing.fee_value as number | null | undefined),
  };

  const est = calcRentalCommission(merged.monthly_rent, merged.fee_type, merged.fee_value);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  });

  fields.push("est_commission = ?", "updated_at = ?");
  values.push(est || null, new Date().toISOString());

  await db.execute({
    sql: `UPDATE rental_deals SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
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
    return NextResponse.json({ ok: false, error: "Invalid rental id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT lead_id FROM rental_deals WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as unknown as { lead_id: number } | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Rental deal not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(existing.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Rental deal not found" }, { status: 404 });
  }

  await db.execute({
    sql: "DELETE FROM rental_deals WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
