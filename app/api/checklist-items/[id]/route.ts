import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";

const updateSchema = z.object({
  label: z.string().optional(),
  is_done: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (value === true || value === "1" || value === 1) return 1;
    if (value === false || value === "0" || value === 0) return 0;
    return NaN;
  }, z.number()).optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid checklist id" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: `SELECT seller_checklist_items.id, seller_profiles.lead_id
      FROM seller_checklist_items
      JOIN seller_profiles ON seller_profiles.id = seller_checklist_items.seller_profile_id
      WHERE seller_checklist_items.id = ? AND seller_checklist_items.org_id = ?`,
    args: [id, ctx.orgId],
  });
  const existingRow = existing.rows[0] as unknown as
    | { id: number; lead_id: number }
    | undefined;
  if (!existingRow) {
    return NextResponse.json({ ok: false, error: "Checklist item not found" }, { status: 404 });
  }
  const access = await canAccessLead(ctx, Number(existingRow.lead_id));
  if (!access) {
    return NextResponse.json({ ok: false, error: "Checklist item not found" }, { status: 404 });
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
    sql: `UPDATE seller_checklist_items SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
    args: [...values, id, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
