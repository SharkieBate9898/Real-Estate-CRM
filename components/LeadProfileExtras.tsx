"use client";

import SourceSection from "@/components/lead-profile/SourceSection";
import TransactionsSection from "@/components/lead-profile/TransactionsSection";
import SellerSection from "@/components/lead-profile/SellerSection";
import RentalsSection from "@/components/lead-profile/RentalsSection";
import { normalizeLeadType } from "@/lib/leadTypes";
import { useLeadType } from "@/components/lead-profile/LeadTypeContext";

type Props = {
  leadId: number;
  initialSource: {
    source?: string | null;
    source_detail?: string | null;
    source_first_touch_at?: string | null;
  };
};

export default function LeadProfileExtras({ leadId, initialSource }: Props) {
  const context = useLeadType();
  const normalizedLeadType = normalizeLeadType(context?.leadType ?? null);
  const showSeller = normalizedLeadType === "seller" || normalizedLeadType === "buyer_seller";
  const showRental = normalizedLeadType === "renter";

  return (
    <div className="space-y-6">
      <SourceSection leadId={leadId} initialSource={initialSource} />
      <TransactionsSection leadId={leadId} />
      {showSeller ? <SellerSection leadId={leadId} /> : null}
      {showRental ? <RentalsSection leadId={leadId} /> : null}
    </div>
  );
}
