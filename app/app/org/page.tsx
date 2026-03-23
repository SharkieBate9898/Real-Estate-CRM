import { redirect } from "next/navigation";
import {
  getCurrentUserContext,
  getOrg,
  listOrgInvites,
  listOrgMembers,
} from "@/lib/org";
import {
  createInviteAction,
  updateMemberRoleAction,
  updateMemberStatusAction,
  updateOrgNameAction,
} from "@/app/app/org/actions";

export default async function OrgPage({
  searchParams,
}: {
  searchParams: { invite?: string; error?: string };
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }

  const org = await getOrg(ctx.orgId);
  const members = await listOrgMembers(ctx.orgId);
  const invites = await listOrgInvites(ctx.orgId);
  const isAdmin = ctx.role === "admin";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const inviteLink = searchParams.invite
    ? `${baseUrl}/invite/accept?token=${searchParams.invite}`
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-slate-500">
          {org?.name ?? "Organization"} • Role: {ctx.role}
        </p>
        {isAdmin ? (
          <form action={updateOrgNameAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              name="name"
              className="min-w-[200px] flex-1"
              defaultValue={org?.name ?? ""}
              placeholder="Team name"
              required
            />
            <button
              type="submit"
              className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-950"
            >
              Save Name
            </button>
          </form>
        ) : null}
      </div>

      {searchParams.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {inviteLink ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Invite created</p>
          <p className="mt-1 text-xs text-emerald-700">
            Share this link with the teammate you want to invite:
          </p>
          <input
            className="mt-2 w-full"
            readOnly
            value={inviteLink}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Members</h2>
          <div className="mt-3 space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{member.email}</p>
                  <p className="text-xs text-slate-500">
                    Role: {member.role} • Status: {member.status}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={updateMemberRoleAction}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        className="w-full min-w-[140px]"
                      >
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                        <option value="assistant">Assistant</option>
                      </select>
                      <button
                        type="submit"
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                      >
                        Update Role
                      </button>
                    </form>
                    <form action={updateMemberStatusAction}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <select
                        name="status"
                        defaultValue={member.status}
                        className="w-full min-w-[140px]"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                      <button
                        type="submit"
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                      >
                        Update Status
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Invite Member</h2>
            {isAdmin ? (
              <form action={createInviteAction} className="mt-3 space-y-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input name="email" type="email" className="mt-2 w-full" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select name="role" className="mt-2 w-full" defaultValue="agent">
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Create Invite
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Only admins can invite new members.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Pending Invites</h2>
            <div className="mt-3 space-y-2">
              {invites.length === 0 ? (
                <p className="text-sm text-slate-400">No invites yet.</p>
              ) : (
                invites.map((invite) => {
                  const link = `${baseUrl}/invite/accept?token=${invite.token}`;
                  return (
                    <div key={invite.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        Role: {invite.role} • Expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                      {isAdmin ? (
                        <input
                          className="mt-2 w-full"
                          readOnly
                          value={link}
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
