import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";

const numberField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : NaN;
}, z.number().nullable());

const updateSchema = z.object({
  property_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  monthly_rent: numberField.optional(),
  management_percent: numberField.optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["active", "ended"]).optional(),
});

function calcMonthlyManagementFee(monthlyRent?: number | null, managementPercent?: number | null) {
  if (!monthlyRent || !managementPercent) return 0;
  return (monthlyRent * managementPercent) / 100;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid contract id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT * FROM property_management_contracts WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
  }
  const leadId = Number(existing.lead_id);
  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
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
    management_percent:
      parsed.data.management_percent !== undefined
        ? parsed.data.management_percent
        : (existing.management_percent as number | null | undefined),
  };
  const fee = calcMonthlyManagementFee(merged.monthly_rent, merged.management_percent);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  });

  fields.push("monthly_management_fee = ?", "updated_at = ?");
  values.push(fee || null, new Date().toISOString());

  await db.execute({
    sql: `UPDATE property_management_contracts SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
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
    return NextResponse.json({ ok: false, error: "Invalid contract id" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT lead_id FROM property_management_contracts WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existing = existingResult.rows[0] as unknown as { lead_id: number } | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(existing.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
  }

  await db.execute({
    sql: "DELETE FROM property_management_contracts WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
