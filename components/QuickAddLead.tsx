"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { addLead } from "@/app/app/actions";
import { useRouter, useSearchParams } from "next/navigation";

const initialState: { error?: string; success?: boolean } = {};

type OwnerOption = {
  id: number;
  label: string;
  role: "admin" | "agent" | "assistant";
  status: "active" | "invited" | "disabled";
};

export default function QuickAddLead({
  owners = [],
  currentRole,
  assistantAgentIds = [],
}: {
  owners?: OwnerOption[];
  currentRole: "admin" | "agent" | "assistant";
  assistantAgentIds?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(addLead, initialState);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!state?.success) return;
    setOpen(false);
    window.location.reload();
  }, [state?.success]);

  const agentOptions = owners.filter(
    (owner) => owner.role === "agent" && owner.status === "active"
  );
  const showOwnerSelect = currentRole === "assistant" && assistantAgentIds.length > 1;
  const singleAgentOwner =
    currentRole === "assistant" && assistantAgentIds.length === 1
      ? assistantAgentIds[0]
      : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Lead
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:ring-1 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Lead</h2>
              <button
                type="button"
                className="text-sm text-slate-500"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <form action={formAction} className="mt-6 space-y-5">
              {showOwnerSelect ? (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Owner (required)</label>
                  <select name="owner_user_id" className="mt-1.5 w-full py-2.5" required>
                    <option value="">Select agent</option>
                    {agentOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {singleAgentOwner ? (
                <input type="hidden" name="owner_user_id" value={singleAgentOwner} />
              ) : null}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input name="name" className="mt-1.5 w-full py-2.5" placeholder="Jane Doe" required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                  <input name="phone" className="mt-1.5 w-full py-2.5" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input name="email" type="email" className="mt-1.5 w-full py-2.5" placeholder="jane@example.com" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Source</label>
                <input
                  name="source"
                  className="mt-1.5 w-full py-2.5"
                  placeholder="open house, referral, website..."
                />
              </div>
              {state?.error ? (
                <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  {state.error}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Save Lead
                </button>
              </div>
              {state?.success ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Lead created! Refresh to see it.
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
