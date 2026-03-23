"use server";

import { z } from "zod";
import { addInteraction, deleteLead, updateLead } from "@/lib/leads";
import { canAccessLead, getCurrentUserContext, type UserContext } from "@/lib/org";
import { interactionTypes } from "@/lib/db";
import { leadStages } from "@/lib/leadStages";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const stageSchema = z.object({
  leadId: z.string(),
  stage: z.enum(leadStages),
});

const noteSchema = z.object({
  leadId: z.string(),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  leadId: z.string(),
  next_action_at: z.string().optional(),
  next_action_text: z.string().optional(),
});

const contactInfoSchema = z.object({
  leadId: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const assignSchema = z.object({
  leadId: z.string(),
  assigned_user_id: z.string().optional(),
});

const interactionSchema = z.object({
  leadId: z.string(),
  type: z.enum(interactionTypes),
  content: z.string().min(1),
  occurred_at: z.string().optional(),
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

async function ensureAccess(ctx: UserContext, leadId: number) {
  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    throw new Error("Forbidden");
  }
}

export async function updateStage(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = stageSchema.parse({
    leadId: formData.get("leadId"),
    stage: formData.get("stage"),
  });

  await ensureAccess(ctx, Number(values.leadId));
  await updateLead(ctx.orgId, Number(values.leadId), { stage: values.stage });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function saveNotes(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = noteSchema.parse({
    leadId: formData.get("leadId"),
    notes: formData.get("notes")?.toString(),
  });

  await ensureAccess(ctx, Number(values.leadId));
  await updateLead(ctx.orgId, Number(values.leadId), { notes: values.notes ?? null });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function updateNextAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = contactSchema.parse({
    leadId: formData.get("leadId"),
    next_action_at: formData.get("next_action_at")?.toString(),
    next_action_text: formData.get("next_action_text")?.toString(),
  });

  await ensureAccess(ctx, Number(values.leadId));
  await updateLead(ctx.orgId, Number(values.leadId), {
    next_action_at: values.next_action_at ? new Date(values.next_action_at).toISOString() : null,
    next_action_text: values.next_action_text ?? null,
  });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function markContacted(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const leadId = Number(formData.get("leadId"));
  await ensureAccess(ctx, leadId);
  await updateLead(ctx.orgId, leadId, {
    last_contacted_at: new Date().toISOString(),
    stage: "contacted",
  });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${leadId}`);
}

export async function updateContactInfo(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = contactInfoSchema.parse({
    leadId: formData.get("leadId"),
    phone: formData.get("phone")?.toString(),
    email: formData.get("email")?.toString(),
  });

  await ensureAccess(ctx, Number(values.leadId));
  await updateLead(ctx.orgId, Number(values.leadId), {
    phone: values.phone?.trim() ? values.phone.trim() : null,
    email: values.email?.trim() ? values.email.trim() : null,
  });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function updateAssignment(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = assignSchema.parse({
    leadId: formData.get("leadId"),
    assigned_user_id: formData.get("assigned_user_id"),
  });

  const assignedValue = values.assigned_user_id?.toString().trim();
  const assignedUserId = assignedValue ? Number(assignedValue) : null;
  if (assignedUserId !== null && Number.isNaN(assignedUserId)) {
    throw new Error("Invalid assigned user");
  }

  await ensureAccess(ctx, Number(values.leadId));
  await updateLead(ctx.orgId, Number(values.leadId), {
    assigned_user_id: assignedUserId,
  });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function addLeadInteraction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = interactionSchema.parse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    content: formData.get("content"),
    occurred_at: formData.get("occurred_at")?.toString(),
  });

  await ensureAccess(ctx, Number(values.leadId));
  await addInteraction(ctx.orgId, ctx.userId, Number(values.leadId), {
    type: values.type,
    content: values.content,
    occurred_at: values.occurred_at ? new Date(values.occurred_at).toISOString() : undefined,
  });
  revalidatePath("/app");
  revalidatePath(`/app/leads/${values.leadId}`);
}

export async function removeLead(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  if (ctx.role === "assistant") {
    throw new Error("Forbidden");
  }
  const leadId = Number(formData.get("leadId"));
  await ensureAccess(ctx, leadId);
  await deleteLead(ctx.orgId, leadId);
  revalidatePath("/app");
  redirect("/app");
}

export async function updateLeadDetails(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const leadId = Number(formData.get("leadId"));
  await ensureAccess(ctx, leadId);

  const priceMin = parseOptionalNumber(formData.get("price_min"), "Price min");
  const priceMax = parseOptionalNumber(formData.get("price_max"), "Price max");
  const bedroomsMin = parseOptionalNumber(formData.get("bedrooms_min"), "Bedrooms min");
  const bathroomsMin = parseOptionalNumber(formData.get("bathrooms_min"), "Bathrooms min");
  const commuteMaxMin = parseOptionalNumber(formData.get("commute_max_min"), "Commute max minutes");
  const rentMin = parseOptionalNumber(formData.get("rent_min"), "Rent min");
  const rentMax = parseOptionalNumber(formData.get("rent_max"), "Rent max");

  const numberErrors = [
    priceMin.error,
    priceMax.error,
    bedroomsMin.error,
    bathroomsMin.error,
    commuteMaxMin.error,
    rentMin.error,
    rentMax.error,
  ].filter(Boolean);
  if (numberErrors.length > 0) {
    throw new Error(numberErrors[0]);
  }

  if (
    priceMin.value !== undefined &&
    priceMax.value !== undefined &&
    priceMin.value !== null &&
    priceMax.value !== null &&
    priceMin.value > priceMax.value
  ) {
    throw new Error("Price min cannot exceed price max.");
  }
  if (bedroomsMin.value !== undefined && bedroomsMin.value !== null && bedroomsMin.value < 0) {
    throw new Error("Bedrooms min must be 0 or higher.");
  }
  if (bathroomsMin.value !== undefined && bathroomsMin.value !== null && bathroomsMin.value < 0) {
    throw new Error("Bathrooms min must be 0 or higher.");
  }
  if (
    commuteMaxMin.value !== undefined &&
    commuteMaxMin.value !== null &&
    commuteMaxMin.value < 0
  ) {
    throw new Error("Commute max minutes must be 0 or higher.");
  }
  if (
    rentMin.value !== undefined &&
    rentMax.value !== undefined &&
    rentMin.value !== null &&
    rentMax.value !== null &&
    rentMin.value > rentMax.value
  ) {
    throw new Error("Rent min cannot exceed rent max.");
  }

  await updateLead(ctx.orgId, leadId, {
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
    doc_preapproval_received: parseOptionalBoolean01(
      formData.get("doc_preapproval_received")
    ),
    doc_proof_of_funds_received: parseOptionalBoolean01(
      formData.get("doc_proof_of_funds_received")
    ),
    doc_buyer_agency_signed: parseOptionalBoolean01(formData.get("doc_buyer_agency_signed")),
    doc_listing_agreement_signed: parseOptionalBoolean01(
      formData.get("doc_listing_agreement_signed")
    ),
    doc_property_disclosures_received: parseOptionalBoolean01(
      formData.get("doc_property_disclosures_received")
    ),
    doc_hoa_docs_received: parseOptionalBoolean01(formData.get("doc_hoa_docs_received")),
    doc_notes: parseOptionalText(formData.get("doc_notes")),
    rent_min: rentMin.value,
    rent_max: rentMax.value,
    lease_start_date: parseOptionalText(formData.get("lease_start_date")),
    pets_allowed: parseOptionalBoolean01(formData.get("pets_allowed")),
    application_submitted: parseOptionalBoolean01(formData.get("application_submitted")),
    landlord_contact_name: parseOptionalText(formData.get("landlord_contact_name")),
    landlord_contact_phone: parseOptionalText(formData.get("landlord_contact_phone")),
    landlord_contact_email: parseOptionalText(formData.get("landlord_contact_email")),
    rental_notes: parseOptionalText(formData.get("rental_notes")),
  });

  revalidatePath("/app");
  revalidatePath(`/app/leads/${leadId}`);
}
