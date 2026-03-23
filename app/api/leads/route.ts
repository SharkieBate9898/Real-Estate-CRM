import { NextResponse } from "next/server";
import { getCurrentUserContext, getVisibleOwnerIds } from "@/lib/org";
import { listLeads } from "@/lib/leads";

export async function GET(request: Request) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const leadType = searchParams.get("lead_type") ?? undefined;
  const ownerIds = await getVisibleOwnerIds(ctx);

  const leads = await listLeads({
    orgId: ctx.orgId,
    owner_user_ids: ownerIds ?? undefined,
    search: search?.trim() || undefined,
    source: source?.trim() || undefined,
    lead_type: leadType?.trim() || undefined,
    sort: sort === "created" ? "created" : "next_action",
  });

  return NextResponse.json({ ok: true, data: leads });
}
