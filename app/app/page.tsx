import Link from "next/link";
import { redirect } from "next/navigation";
import { listLeads, listReminders } from "@/lib/leads";
import { getCurrentUserContext, getVisibleOwnerIds, listOrgMembers } from "@/lib/org";
import QuickAddLead from "@/components/QuickAddLead";
import LeadsBoard from "@/components/LeadsBoard";
import clsx from "clsx";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { search?: string; source?: string; sort?: string; lead_type?: string; owner?: string };
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }

  const ownerIds = await getVisibleOwnerIds(ctx);
  const currentView = searchParams.owner === "all" ? "all" : "me";

  const filterOwnerIds =
    ctx.role === "admin"
      ? (currentView === "me" ? [ctx.userId] : undefined)
      : (ownerIds ?? undefined);

  const leads = await listLeads({
    orgId: ctx.orgId,
    owner_user_ids: filterOwnerIds,
    search: searchParams.search,
    source: searchParams.source,
    lead_type: searchParams.lead_type,
    sort: searchParams.sort === "created" ? "created" : "next_action",
  });
  const { overdue, stale } = await listReminders(ctx.orgId, filterOwnerIds);
  const members = await listOrgMembers(ctx.orgId);
  const memberMap = Object.fromEntries(
    members.map((member) => {
      let name = member.email.split("@")[0];
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      return [member.user_id, name];
    })
  );
  const showOwner = ctx.role === "admin";
  const hasActionItems = overdue.length > 0 || stale.length > 0;

  return (
    <div className="flex flex-col h-full space-y-6 min-h-0">
      {/* Page Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your leads, track deal stages, and close.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {ctx.role === "admin" && (
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
              <Link
                href={{ pathname: "/app", query: { ...searchParams, owner: "me" } }}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  currentView === "me"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
              >
                My Leads
              </Link>
              <Link
                href={{ pathname: "/app", query: { ...searchParams, owner: "all" } }}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  currentView === "all"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
              >
                All Leads
              </Link>
            </div>
          )}
          <QuickAddLead
            owners={members.map((member) => ({
              id: member.user_id,
              label: member.email,
              role: member.role,
              status: member.status,
            }))}
            currentRole={ctx.role}
            assistantAgentIds={
              ctx.role === "assistant"
                ? ownerIds?.filter((id) => id !== ctx.userId) ?? []
                : []
            }
          />
        </div>
      </div>

      {/* Action Items (Morning Briefing) */}
      {hasActionItems && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Needs Attention
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {overdue.map((lead) => (
              <Link
                key={`overdue-${lead.id}`}
                href={`/app/leads/${lead.id}`}
                className="group relative flex flex-col gap-2 rounded-xl border border-red-200 bg-white p-4 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-red-900/50 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-4">{lead.name}</p>
                  <span className="flex-shrink-0 flex h-2 w-2 rounded-full bg-red-500"></span>
                </div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 truncate">
                  Overdue: {lead.next_action_text || "Follow up"}
                </p>
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover:ring-red-500 transition-all pointer-events-none" />
              </Link>
            ))}
            {stale.map((lead) => (
              <Link
                key={`stale-${lead.id}`}
                href={`/app/leads/${lead.id}`}
                className="group relative flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-amber-900/50 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-4">{lead.name}</p>
                  <span className="flex-shrink-0 flex h-2 w-2 rounded-full bg-amber-500"></span>
                </div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
                  Stale: Last contact {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : "Unknown"}
                </p>
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover:ring-amber-500 transition-all pointer-events-none" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Workspace: Toolbar & Board */}
      <section className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <form className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                name="search"
                defaultValue={searchParams.search}
                className="block w-full rounded-lg border-0 py-2 pl-4 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:leading-6"
                placeholder="Search leads by name, email, or phone..."
                aria-label="Search leads"
              />
            </div>
            <div className="flex gap-2">
              <select
                name="lead_type"
                defaultValue={searchParams.lead_type ?? "all"}
                className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:w-40 sm:leading-6"
                aria-label="Lead Type"
              >
                <option value="all">All Types</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="renter">Renter</option>
                <option value="buyer_seller">Buyer + Seller</option>
                <option value="unset">Unassigned</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700/50"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-slate-50/20 dark:bg-transparent min-h-[500px]">
          <LeadsBoard initialLeads={leads} memberMap={memberMap} showOwner={showOwner} />
        </div>
      </section>
    </div>
  );
}
