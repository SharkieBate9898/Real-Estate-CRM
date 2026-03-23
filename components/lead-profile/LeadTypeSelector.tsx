"use client";

import { useMemo, useState, useTransition } from "react";
import { apiFetch } from "@/components/lead-profile/api";
import { normalizeLeadType } from "@/lib/leadTypes";
import { useLeadType } from "@/components/lead-profile/LeadTypeContext";

type Props = {
  leadId: number;
  initialLeadType: string | null | undefined;
};

export default function LeadTypeSelector({ leadId, initialLeadType }: Props) {
  const [isPending, startTransition] = useTransition();
  const context = useLeadType();
  const [value, setValue] = useState<string>(normalizeLeadType(initialLeadType) ?? "");
  const currentValue = useMemo(
    () => (context ? context.leadType ?? "" : value),
    [context, value]
  );

  const handleChange = (nextValue: string) => {
    if (context) {
      context.setLeadType(normalizeLeadType(nextValue));
    } else {
      setValue(nextValue);
    }
    startTransition(() => {
      apiFetch(`/api/leads/${leadId}/type`, {
        method: "PATCH",
        body: JSON.stringify({ lead_type: nextValue ? nextValue : null }),
      })
        .catch(() => {});
    });
  };

  return (
    <div>
      <label className="text-sm font-medium">Lead Type (optional)</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <select
          className="w-full"
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isPending}
        >
          <option value="">Unset</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="renter">Renter</option>
          <option value="buyer_seller">Buyer + Seller</option>
        </select>
        {isPending ? <span className="text-xs text-slate-500">Saving...</span> : null}
      </div>
    </div>
  );
}
