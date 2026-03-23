import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUserContext,
  listAssistantInvites,
  listAssistantLinks,
  listOrgMembersByRole,
} from "@/lib/org";
import {
  createAssistantInviteAction,
  removeAssistantLinkAction,
} from "@/app/app/assistants/actions";

export default async function AssistantsPage({
  searchParams,
}: {
  searchParams: { invite?: string; error?: string };
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }

  const isAdmin = ctx.role === "admin";
  const agents = await listOrgMembersByRole(ctx.orgId, ["agent", "admin"]);
  const agentOptions = agents.filter((agent) => agent.status === "active");
  const links = await listAssistantLinks(ctx.orgId, isAdmin ? undefined : ctx.userId);
  const invites = await listAssistantInvites(ctx.orgId, isAdmin ? undefined : ctx.userId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const inviteLink = searchParams.invite
    ? `${baseUrl}/assistant-invite/accept?token=${searchParams.invite}`
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Assistant Assignments</h1>
        <p className="text-sm text-slate-500">
          Invite assistants to help manage leads for specific agents.
        </p>
      </div>

      {searchParams.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {inviteLink ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Assistant invite created</p>
          <p className="mt-1 text-xs text-emerald-700">
            Share this link with the assistant:
          </p>
          <input className="mt-2 w-full" readOnly value={inviteLink} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Active Links</h2>
          <div className="mt-3 space-y-3">
            {links.length === 0 ? (
              <p className="text-sm text-slate-400">No assistant links yet.</p>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{link.assistant_email}</p>
                    <p className="text-xs text-slate-500">Agent: {link.agent_email}</p>
                  </div>
                  {(isAdmin || ctx.role === "agent") && (
                    <form action={removeAssistantLinkAction}>
                      <input type="hidden" name="linkId" value={link.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Invite Assistant</h2>
            {(ctx.role === "assistant") ? (
              <p className="mt-2 text-sm text-slate-500">
                Assistants cannot invite others.
              </p>
            ) : (
              <form action={createAssistantInviteAction} className="mt-3 space-y-3">
                {isAdmin ? (
                  <div>
                    <label className="text-sm font-medium">Agent</label>
                    <select name="agent_user_id" className="mt-2 w-full" required>
                      <option value="">Select agent</option>
                      {agentOptions.map((agent) => (
                        <option key={agent.user_id} value={agent.user_id}>
                          {agent.email}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input type="hidden" name="agent_user_id" value={ctx.userId} />
                )}
                <div>
                  <label className="text-sm font-medium">Assistant email</label>
                  <input name="email" type="email" className="mt-2 w-full" required />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Create Invite
                </button>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Pending Invites</h2>
            <div className="mt-3 space-y-2">
              {invites.length === 0 ? (
                <p className="text-sm text-slate-400">No invites yet.</p>
              ) : (
                invites.map((invite) => {
                  const link = `${baseUrl}/assistant-invite/accept?token=${invite.token}`;
                  return (
                    <div key={invite.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        Agent: {invite.agent_email} • Expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                      <input className="mt-2 w-full" readOnly value={link} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Assistants must accept their invite link to see agent leads. If they already
            have an account, they can sign in and accept the invite.
          </p>
          <Link className="text-xs text-slate-500 underline" href="/app/org">
            Manage team roles
          </Link>
        </div>
      </div>
    </div>
  );
}
