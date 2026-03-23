"use server";

import { z } from "zod";
import { createLead, updateLead } from "@/lib/leads";
import { canAccessLead, getCurrentUserContext, listAssistantAgentIds } from "@/lib/org";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { leadStages, type LeadStage } from "@/lib/leadStages";
import { db } from "@/lib/db";

const leadSchema = z.object({
  name: z.preprocess((value) => String(value ?? "").trim(), z.string().min(1)),
  phone: z.preprocess((value) => String(value ?? "").trim(), z.string().optional()),
  email: z.preprocess(
    (value) => String(value ?? "").trim(),
    z.string().email().optional().or(z.literal(""))
  ),
  source: z.preprocess((value) => String(value ?? "").trim(), z.string().optional()),
});

function parseOptionalNumber(value: FormDataEntryValue | null, label: string) {
  if (value === null) return { value: undefined as number | null | undefined };
  const text = value.toString().trim();
  if (!text) return { value: null as number | null };
  const numberValue = Number(text);
  if (Number.isNaN(numberValue)) {
    return { value: undefined as number | null | undefined, error: `${label} must be a number.` };
  }
  return { value: numberValue };
}

function parseOptionalText(value: FormDataEntryValue | null) {
  if (value === null) return undefined;
  const text = value.toString().trim();
  if (!text) return null;
  return text;
}

function parseOptionalBoolean01(value: FormDataEntryValue | null) {
  if (value === null) return undefined;
  const text = value.toString();
  if (text === "") return null;
  if (text === "1") return 1;
  if (text === "0") return 0;
  return undefined;
}

const moveStageSchema = z.object({
  leadId: z.string(),
  stage: z.enum(leadStages),
});

const boardStageSchema = z.object({
  leadId: z.number().int().positive(),
  stage: z.enum(leadStages),
});

export async function addLead(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    source: formData.get("source"),
  });

  if (!values.success) {
    return { error: "Please enter a name and valid email (if provided)." };
  }

  const priceMin = parseOptionalNumber(formData.get("price_min"), "Price min");
  const priceMax = parseOptionalNumber(formData.get("price_max"), "Price max");
  const bedroomsMin = parseOptionalNumber(formData.get("bedrooms_min"), "Bedrooms min");
  const bathroomsMin = parseOptionalNumber(formData.get("bathrooms_min"), "Bathrooms min");
  const commuteMaxMin = parseOptionalNumber(formData.get("commute_max_min"), "Commute max minutes");
  const sellerEstimated = parseOptionalNumber(
    formData.get("seller_estimated_value"),
    "Seller estimated value"
  );
  const sellerMortgage = parseOptionalNumber(
    formData.get("seller_mortgage_balance"),
    "Seller mortgage balance"
  );
  const sellerMotivation = parseOptionalNumber(
    formData.get("seller_motivation_level"),
    "Seller motivation level"
  );
  const sellerCondition = parseOptionalNumber(
    formData.get("seller_condition_score"),
    "Seller condition score"
  );
  const rentalMonthly = parseOptionalNumber(
    formData.get("rental_monthly_rent"),
    "Rental monthly rent"
  );
  const rentalLeaseTerm = parseOptionalNumber(
    formData.get("rental_lease_term_months"),
    "Rental lease term months"
  );
  const rentalFeeValue = parseOptionalNumber(
    formData.get("rental_fee_value"),
    "Rental fee value"
  );

  const numberErrors = [
    priceMin.error,
    priceMax.error,
    bedroomsMin.error,
    bathroomsMin.error,
    commuteMaxMin.error,
    sellerEstimated.error,
    sellerMortgage.error,
    sellerMotivation.error,
    sellerCondition.error,
    rentalMonthly.error,
    rentalLeaseTerm.error,
    rentalFeeValue.error,
  ].filter(Boolean);
  if (numberErrors.length > 0) {
    return { error: numberErrors[0] };
  }

  if (
    priceMin.value !== undefined &&
    priceMax.value !== undefined &&
    priceMin.value !== null &&
    priceMax.value !== null &&
    priceMin.value > priceMax.value
  ) {
    return { error: "Price min cannot exceed price max." };
  }
  if (bedroomsMin.value !== undefined && bedroomsMin.value !== null && bedroomsMin.value < 0) {
    return { error: "Bedrooms min must be 0 or higher." };
  }
  if (bathroomsMin.value !== undefined && bathroomsMin.value !== null && bathroomsMin.value < 0) {
    return { error: "Bathrooms min must be 0 or higher." };
  }
  if (
    commuteMaxMin.value !== undefined &&
    commuteMaxMin.value !== null &&
    commuteMaxMin.value < 0
  ) {
    return { error: "Commute max minutes must be 0 or higher." };
  }

  const source = parseOptionalText(formData.get("source"));
  const ownerUserIdRaw = formData.get("owner_user_id");
  const parsedOwnerId =
    ownerUserIdRaw && ownerUserIdRaw.toString().trim()
      ? Number(ownerUserIdRaw.toString())
      : undefined;
  if (parsedOwnerId !== undefined && Number.isNaN(parsedOwnerId)) {
    return { error: "Invalid owner selection." };
  }

  let ownerUserId = parsedOwnerId ?? ctx.userId;
  if (ctx.role === "assistant") {
    const agentIds = await listAssistantAgentIds(ctx.orgId, ctx.userId);
    if (parsedOwnerId === undefined) {
      if (agentIds.length === 1) {
        ownerUserId = agentIds[0];
      } else if (agentIds.length > 1) {
        return { error: "Please select an agent owner for this lead." };
      }
    } else if (!agentIds.includes(parsedOwnerId)) {
      return { error: "You can only create leads for your linked agents." };
    }
  }
  if (ctx.role === "agent" && ownerUserId !== ctx.userId) {
    return { error: "Agents can only create their own leads." };
  }

  const leadType = parseOptionalText(formData.get("lead_type")) as
    | "buyer"
    | "seller"
    | "rental"
    | "renter"
    | "buyer_seller"
    | "both"
    | null
    | undefined;
  const normalizedLeadType =
    leadType && ["buyer", "seller", "rental", "renter", "buyer_seller", "both"].includes(leadType)
      ? leadType === "rental"
        ? "renter"
        : leadType
      : undefined;

  const assignedUserId =
    ctx.role === "assistant" && ownerUserId !== ctx.userId ? ctx.userId : undefined;

  const leadId = await createLead(ctx.orgId, ctx.userId, {
    name: values.data.name,
    phone: values.data.phone || undefined,
    email: values.data.email || undefined,
    source: source && source.length > 0 ? source : "unknown",
    owner_user_id: ownerUserId,
    assigned_user_id: assignedUserId ?? undefined,
    lead_type: normalizedLeadType ?? null,
    price_min: priceMin.value,
    price_max: priceMax.value,
    has_kids: parseOptionalBoolean01(formData.get("has_kids")),
    vehicle: parseOptionalText(formData.get("vehicle")),
    timeline: parseOptionalText(formData.get("timeline")) as
      | "0-3 months"
      | "3-6 months"
      | "6-12 months"
      | "unknown"
      | null
      | undefined,
    preapproved: parseOptionalBoolean01(formData.get("preapproved")),
    lender_name: parseOptionalText(formData.get("lender_name")),
    down_payment_range: parseOptionalText(formData.get("down_payment_range")) as
      | "5-10%"
      | "10-20%"
      | "20%+"
      | "unknown"
      | null
      | undefined,
    credit_confidence: parseOptionalText(formData.get("credit_confidence")) as
      | "low"
      | "medium"
      | "high"
      | "unknown"
      | null
      | undefined,
    bedrooms_min: bedroomsMin.value,
    bathrooms_min: bathroomsMin.value,
    property_type: parseOptionalText(formData.get("property_type")) as
      | "single_family"
      | "townhouse"
      | "condo"
      | "land"
      | "multi_family"
      | "other"
      | null
      | undefined,
    preferred_areas: parseOptionalText(formData.get("preferred_areas")),
    school_priority: parseOptionalText(formData.get("school_priority")) as
      | "low"
      | "medium"
      | "high"
      | "unknown"
      | null
      | undefined,
    commute_city: parseOptionalText(formData.get("commute_city")),
    commute_max_min: commuteMaxMin.value,
    work_from_home: parseOptionalText(formData.get("work_from_home")) as
      | "yes"
      | "no"
      | "hybrid"
      | "unknown"
      | null
      | undefined,
    pets: parseOptionalText(formData.get("pets")) as
      | "dog"
      | "cat"
      | "both"
      | "none"
      | "unknown"
      | null
      | undefined,
    important_notes: parseOptionalText(formData.get("important_notes")),
  });

  const now = new Date().toISOString();

  if (normalizedLeadType === "seller" || normalizedLeadType === "buyer_seller") {
    const sellerProfileResult = await db.execute({
      sql: `INSERT INTO seller_profiles
        (user_id, org_id, lead_id, property_address, estimated_value, mortgage_balance,
         motivation_level, condition_score, listing_readiness, target_list_date,
         has_hoa, hoa_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ctx.userId,
        ctx.orgId,
        leadId,
        parseOptionalText(formData.get("seller_property_address")) ?? null,
        sellerEstimated.value ?? null,
        sellerMortgage.value ?? null,
        sellerMotivation.value ?? null,
        sellerCondition.value ?? null,
        parseOptionalText(formData.get("seller_listing_readiness")) ?? null,
        parseOptionalText(formData.get("seller_target_list_date")) ?? null,
        parseOptionalBoolean01(formData.get("seller_has_hoa")) ?? null,
        parseOptionalText(formData.get("seller_hoa_notes")) ?? null,
        now,
        now,
      ],
    });
    const sellerProfileId = Number(sellerProfileResult.lastInsertRowid);
    const checklistItems = [
      "CMA completed",
      "Listing paperwork discussed",
      "Photos scheduled",
      "Repairs list created",
      "Staging discussed",
      "Pre-list walk-through completed",
    ];
    for (const label of checklistItems) {
      await db.execute({
        sql: `INSERT INTO seller_checklist_items
          (user_id, org_id, seller_profile_id, label, is_done, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, ?)`,
        args: [ctx.userId, ctx.orgId, sellerProfileId, label, now, now],
      });
    }
  }

  if (normalizedLeadType === "renter") {
    const monthlyRent = rentalMonthly.value;
    const feeType = parseOptionalText(formData.get("rental_fee_type")) as
      | "one_month"
      | "percent"
      | "flat"
      | null
      | undefined;
    const feeValue = rentalFeeValue.value;
    const { calcRentalCommission } = await import("@/lib/calcs");
    const estCommission = calcRentalCommission(monthlyRent ?? null, feeType ?? null, feeValue ?? null);

    await db.execute({
      sql: `INSERT INTO rental_deals
        (user_id, org_id, lead_id, role, monthly_rent, lease_term_months, move_in_date,
         fee_type, fee_value, est_commission, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ctx.userId,
        ctx.orgId,
        leadId,
        parseOptionalText(formData.get("rental_role")) ?? "tenant_rep",
        monthlyRent ?? null,
        rentalLeaseTerm.value ?? null,
        parseOptionalText(formData.get("rental_move_in_date")) ?? null,
        feeType ?? null,
        feeValue ?? null,
        estCommission || null,
        "pending",
        parseOptionalText(formData.get("rental_notes")) ?? null,
        now,
        now,
      ],
    });
  }

  revalidatePath("/app");
  return { success: true };
}

export async function moveLeadStage(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = moveStageSchema.parse({
    leadId: formData.get("leadId"),
    stage: formData.get("stage"),
  });

  await updateLead(ctx.orgId, Number(values.leadId), { stage: values.stage });
  revalidatePath("/app");
}

export async function updateLeadStageBoard(leadId: number, stage: LeadStage) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }

  const values = boardStageSchema.parse({ leadId, stage });
  const now = new Date().toISOString();

  const access = await canAccessLead(ctx, values.leadId);
  if (!access) {
    throw new Error("Forbidden");
  }

  await db.execute({
    sql: "UPDATE leads SET stage = ?, updated_at = ? WHERE id = ? AND org_id = ?",
    args: [values.stage, now, values.leadId, ctx.orgId],
  });

  revalidatePath("/app");
}
