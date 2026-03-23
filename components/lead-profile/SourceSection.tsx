"use client";

import { useState } from "react";
import { apiFetch } from "@/components/lead-profile/api";

type Props = {
  leadId: number;
  initialSource: {
    source?: string | null;
    source_detail?: string | null;
    source_first_touch_at?: string | null;
  };
};

export default function SourceSection({ leadId, initialSource }: Props) {
  const [source, setSource] = useState(initialSource.source ?? "");
  const [sourceDetail, setSourceDetail] = useState(initialSource.source_detail ?? "");
  const [sourceFirstTouchAt, setSourceFirstTouchAt] = useState(
    initialSource.source_first_touch_at?.split("T")[0] ?? ""
  );
  const [status, setStatus] = useState<string | null>(null);

  const saveSource = async () => {
    setStatus(null);
    try {
      await apiFetch(`/api/leads/${leadId}/source`, {
        method: "PATCH",
        body: JSON.stringify({
          source,
          source_detail: sourceDetail,
          source_first_touch_at: sourceFirstTouchAt || null,
        }),
      });
      setStatus("Saved.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Source</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Source</label>
          <select
            className="mt-2 w-full"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Unknown</option>
            <option value="Instagram">Instagram</option>
            <option value="Open House">Open House</option>
            <option value="Referral">Referral</option>
            <option value="Zillow">Zillow</option>
            <option value="FSBO">FSBO</option>
            <option value="Cold Outreach">Cold Outreach</option>
            <option value="Website">Website</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Source detail</label>
          <input
            className="mt-2 w-full"
            value={sourceDetail}
            onChange={(event) => setSourceDetail(event.target.value)}
            placeholder="Event, ad, partner name..."
          />
        </div>
        <div>
          <label className="text-sm font-medium">First touch date</label>
          <input
            type="date"
            className="mt-2 w-full"
            value={sourceFirstTouchAt}
            onChange={(event) => setSourceFirstTouchAt(event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={saveSource}
        >
          Save Source
        </button>
        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>
    </section>
  );
}
