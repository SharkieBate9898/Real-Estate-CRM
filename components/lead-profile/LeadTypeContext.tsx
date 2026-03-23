"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { normalizeLeadType, type LeadTypeValue } from "@/lib/leadTypes";

type LeadTypeContextValue = {
  leadType: LeadTypeValue;
  setLeadType: (next: LeadTypeValue) => void;
};

const LeadTypeContext = createContext<LeadTypeContextValue | null>(null);

export function LeadTypeProvider({
  initialLeadType,
  children,
}: {
  initialLeadType: string | null | undefined;
  children: React.ReactNode;
}) {
  const [leadType, setLeadType] = useState<LeadTypeValue>(
    normalizeLeadType(initialLeadType)
  );

  const value = useMemo(
    () => ({
      leadType,
      setLeadType,
    }),
    [leadType]
  );

  return <LeadTypeContext.Provider value={value}>{children}</LeadTypeContext.Provider>;
}

export function useLeadType() {
  return useContext(LeadTypeContext);
}

export function LeadTypeGate({
  allow,
  children,
}: {
  allow: Array<Exclude<LeadTypeValue, null>>;
  children: React.ReactNode;
}) {
  const context = useLeadType();
  const leadType = context?.leadType ?? null;
  if (!leadType) return null;
  if (!allow.includes(leadType)) return null;
  return <>{children}</>;
}
