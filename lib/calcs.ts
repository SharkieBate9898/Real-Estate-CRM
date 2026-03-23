export function calcSaleGross(purchasePrice?: number | null, commissionPercent?: number | null) {
  if (!purchasePrice || !commissionPercent) return 0;
  return (purchasePrice * commissionPercent) / 100;
}

export function calcSaleNet(
  gross?: number | null,
  brokerSplitPercent?: number | null,
  referralFeePercent?: number | null
) {
  if (!gross || !brokerSplitPercent) return 0;
  const split = (gross * brokerSplitPercent) / 100;
  if (!referralFeePercent) return split;
  return split * (1 - referralFeePercent / 100);
}

export function calcRentalCommission(
  monthlyRent?: number | null,
  feeType?: string | null,
  feeValue?: number | null
) {
  if (!monthlyRent || !feeType) return 0;
  if (feeType === "one_month") return monthlyRent;
  if (feeType === "percent") {
    if (!feeValue) return 0;
    return (monthlyRent * feeValue) / 100;
  }
  if (feeType === "flat") {
    if (!feeValue) return 0;
    return feeValue;
  }
  return 0;
}
