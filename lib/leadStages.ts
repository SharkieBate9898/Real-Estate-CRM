export const leadStages = [
  "new",
  "contacted",
  "warm",
  "touring",
  "offer",
  "under_contract",
  "closed",
] as const;

export type LeadStage = (typeof leadStages)[number];
