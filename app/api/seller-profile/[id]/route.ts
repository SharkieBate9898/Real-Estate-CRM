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
  estimated_value: numberField.optional(),
  mortgage_balance: numberField.optional(),
  motivation_level: numberField.optional(),
  condition_score: numberField.optional(),
  listing_readiness: z.enum(["not_ready", "getting_ready", "ready"]).optional().nullable(),
  target_list_date: z.string().optional().nullable(),
  has_hoa: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (value === true || value === "1" || value === 1) return 1;
    if (value === false || value === "0" || value === 0) return 0;
    return NaN;
  }, z.number().nullable()).optional(),
  hoa_notes: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid seller profile id" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, lead_id FROM seller_profiles WHERE id = ? AND org_id = ?",
    args: [id, ctx.orgId],
  });
  const existingRow = existing.rows[0] as unknown as
    | { id: number; lead_id: number }
    | undefined;
  if (!existingRow) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(existingRow.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Seller profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  });

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  await db.execute({
    sql: `UPDATE seller_profiles SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
    args: [...values, id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
