import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getAssistantInviteByToken } from "@/lib/org";
import {
  acceptAssistantInviteAction,
  acceptAssistantInviteWithPasswordAction,
} from "@/app/assistant-invite/accept/actions";

export default async function AssistantInviteAcceptPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token;
  if (!token) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p className="text-sm text-slate-500">Missing invite token.</p>
        <Link className="text-sm text-slate-700 underline" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  const user = await getSessionUser();
  const invite = await getAssistantInviteByToken(token);
  if (!invite) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p className="text-sm text-slate-500">This invite is invalid.</p>
      </div>
    );
  }

  const expired = new Date(invite.expires_at) < new Date();
  const emailMatches = user
    ? invite.email.toLowerCase() === user.email.toLowerCase()
    : true;

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <h1 className="text-xl font-semibold">Accept assistant invite</h1>
      {searchParams.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Organization</p>
        <p className="text-base font-medium">{invite.org_name}</p>
        <p className="mt-2 text-sm text-slate-500">Agent</p>
        <p className="text-sm">{invite.agent_email}</p>
        <p className="mt-2 text-sm text-slate-500">Invite email</p>
        <p className="text-sm">{invite.email}</p>
      </div>
      {invite.accepted_at ? (
        <p className="text-sm text-slate-500">This invite has already been accepted.</p>
      ) : expired ? (
        <p className="text-sm text-slate-500">This invite has expired.</p>
      ) : (
        <>
          {user && emailMatches ? (
            <form action={acceptAssistantInviteAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
              >
                Accept Invite
              </button>
            </form>
          ) : (
            <form action={acceptAssistantInviteWithPasswordAction} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  className="mt-2 w-full"
                  defaultValue={invite.email}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium">Set password</label>
                <input
                  name="password"
                  type="password"
                  className="mt-2 w-full"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
              >
                Create Account & Accept
              </button>
            </form>
          )}
          {!user || !emailMatches ? (
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link className="underline" href="/login">
                Sign in
              </Link>{" "}
              and come back to this invite.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
