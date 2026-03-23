export type LeadTypeValue =
  | "buyer"
  | "seller"
  | "rental"
  | "renter"
  | "buyer_seller"
  | "both"
  | null;

export const leadTypeLabels: Record<Exclude<LeadTypeValue, null>, string> = {
  buyer: "Buyer",
  seller: "Seller",
  rental: "Renter",
  renter: "Renter",
  buyer_seller: "Buyer + Seller",
  both: "Buyer + Seller",
};

export function normalizeLeadType(value: string | null | undefined): LeadTypeValue {
  if (!value) return null;
  if (value === "both") return "buyer_seller";
  if (value === "rental") return "renter";
  if (
    value === "buyer" ||
    value === "seller" ||
    value === "renter" ||
    value === "buyer_seller"
  ) {
    return value;
  }
  return null;
}

export function formatLeadTypeLabel(value: string | null | undefined) {
  const normalized = normalizeLeadType(value);
  if (!normalized) return "";
  return leadTypeLabels[normalized];
}
