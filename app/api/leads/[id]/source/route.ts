import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessLead, getCurrentUserContext } from "@/lib/org";
import { db } from "@/lib/db";

const schema = z.object({
  source: z.string().optional().nullable(),
  source_detail: z.string().optional().nullable(),
  source_first_touch_at: z.string().optional().nullable(),
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

  const fields: string[] = [];
  const values: (string | null)[] = [];

  const { source, source_detail, source_first_touch_at } = parsed.data;
  if (source !== undefined) {
    fields.push("source = ?");
    values.push(source && source.trim() ? source.trim() : "unknown");
  }
  if (source_detail !== undefined) {
    fields.push("source_detail = ?");
    values.push(source_detail && source_detail.trim() ? source_detail.trim() : null);
  }
  if (source_first_touch_at !== undefined) {
    fields.push("source_first_touch_at = ?");
    values.push(source_first_touch_at && source_first_touch_at.trim() ? source_first_touch_at : null);
  }

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  await db.execute({
    sql: `UPDATE leads SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`,
    args: [...values, leadId, ctx.orgId],
  });

  return NextResponse.json({ ok: true });
}
