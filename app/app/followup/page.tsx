import { redirect } from "next/navigation";
import { listLeads } from "@/lib/leads";
import { getCurrentUserContext, getVisibleOwnerIds } from "@/lib/org";
import FollowUpGenerator from "@/components/FollowUpGenerator";

export default async function FollowUpPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const ownerIds = await getVisibleOwnerIds(ctx);
  const leads = await listLeads({ orgId: ctx.orgId, owner_user_ids: ownerIds ?? undefined });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Follow-Up Generator</h1>
        <p className="text-sm text-slate-500">
          Pick a lead and generate a follow-up message you can send right away.
        </p>
      </div>
      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Add a lead to start generating messages.</p>
        </div>
      ) : (
        <FollowUpGenerator leads={leads} />
      )}
    </div>
  );
}
