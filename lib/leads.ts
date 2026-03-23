import { db, InteractionType } from "@/lib/db";
import { type LeadStage } from "@/lib/leadStages";

export type Lead = {
  id: number;
  user_id: number;
  org_id: number | null;
  owner_user_id: number | null;
  assigned_user_id: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  source_detail: string | null;
  source_first_touch_at: string | null;
  stage: LeadStage;
  last_contacted_at: string | null;
  next_action_at: string | null;
  next_action_text: string | null;
  notes: string | null;
  price_min: number | null;
  price_max: number | null;
  has_kids: number | null;
  vehicle: string | null;
  lead_type: "buyer" | "seller" | "rental" | "renter" | "buyer_seller" | "both" | null;
  timeline: "0-3 months" | "3-6 months" | "6-12 months" | "unknown" | null;
  preapproved: number | null;
  lender_name: string | null;
  down_payment_range: "5-10%" | "10-20%" | "20%+" | "unknown" | null;
  credit_confidence: "low" | "medium" | "high" | "unknown" | null;
  bedrooms_min: number | null;
  bathrooms_min: number | null;
  property_type:
    | "single_family"
    | "townhouse"
    | "condo"
    | "land"
    | "multi_family"
    | "other"
    | null;
  preferred_areas: string | null;
  school_priority: "low" | "medium" | "high" | "unknown" | null;
  commute_city: string | null;
  commute_max_min: number | null;
  work_from_home: "yes" | "no" | "hybrid" | "unknown" | null;
  pets: "dog" | "cat" | "both" | "none" | "unknown" | null;
  important_notes: string | null;
  doc_preapproval_received: number | null;
  doc_proof_of_funds_received: number | null;
  doc_buyer_agency_signed: number | null;
  doc_listing_agreement_signed: number | null;
  doc_property_disclosures_received: number | null;
  doc_hoa_docs_received: number | null;
  doc_notes: string | null;
  rent_min: number | null;
  rent_max: number | null;
  lease_start_date: string | null;
  pets_allowed: number | null;
  application_submitted: number | null;
  landlord_contact_name: string | null;
  landlord_contact_phone: string | null;
  landlord_contact_email: string | null;
  rental_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: number;
  lead_id: number;
  type: InteractionType;
  content: string;
  occurred_at: string;
  created_at: string;
};

export async function listLeads(params: {
  orgId: number;
  search?: string;
  source?: string;
  sort?: "next_action" | "created";
  lead_type?: string;
  assigned_user_id?: number;
  owner_user_id?: number;
  owner_user_ids?: number[];
}) {
  if (params.owner_user_ids && params.owner_user_ids.length === 0) {
    return [];
  }
  const conditions = ["org_id = ?"];
  const values: (string | number)[] = [params.orgId];

  if (params.search) {
    conditions.push(
      [
        "name LIKE ?",
        "email LIKE ?",
        "phone LIKE ?",
        "notes LIKE ?",
        "source LIKE ?",
        "vehicle LIKE ?",
        "lead_type LIKE ?",
        "timeline LIKE ?",
        "lender_name LIKE ?",
        "down_payment_range LIKE ?",
        "credit_confidence LIKE ?",
        "property_type LIKE ?",
        "preferred_areas LIKE ?",
        "school_priority LIKE ?",
        "commute_city LIKE ?",
        "work_from_home LIKE ?",
        "pets LIKE ?",
        "important_notes LIKE ?",
      ].join(" OR ")
    );
    const like = `%${params.search}%`;
    values.push(
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like
    );
  }

  if (params.source && params.source !== "all") {
    conditions.push("source = ?");
    values.push(params.source);
  }

  if (typeof params.assigned_user_id === "number") {
    conditions.push("assigned_user_id = ?");
    values.push(params.assigned_user_id);
  }
  if (typeof params.owner_user_id === "number") {
    conditions.push("owner_user_id = ?");
    values.push(params.owner_user_id);
  }
  if (params.owner_user_ids && params.owner_user_ids.length > 0) {
    const placeholders = params.owner_user_ids.map(() => "?").join(", ");
    conditions.push(`owner_user_id IN (${placeholders})`);
    values.push(...params.owner_user_ids);
  }

  if (params.lead_type && params.lead_type !== "all") {
    if (params.lead_type === "unset") {
      conditions.push("(lead_type IS NULL OR lead_type = '')");
    } else if (params.lead_type === "buyer_seller") {
      conditions.push("(lead_type = ? OR lead_type = 'both')");
      values.push("buyer_seller");
    } else if (params.lead_type === "renter" || params.lead_type === "rental") {
      conditions.push("(lead_type = ? OR lead_type = ?)");
      values.push("renter", "rental");
    } else {
      conditions.push("lead_type = ?");
      values.push(params.lead_type);
    }
  }

  const orderBy =
    params.sort === "created"
      ? "created_at DESC"
      : "CASE WHEN next_action_at IS NULL THEN 1 ELSE 0 END, next_action_at ASC";

  const query = `SELECT * FROM leads WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy}`;
  const result = await db.execute({ sql: query, args: values });
  return result.rows as unknown as Lead[];
}

export async function getLead(orgId: number, leadId: number) {
  const result = await db.execute({
    sql: "SELECT * FROM leads WHERE id = ? AND org_id = ?",
    args: [leadId, orgId],
  });
  return (result.rows[0] as unknown as Lead | undefined) ?? undefined;
}

export async function listInteractions(orgId: number, leadId: number) {
  const result = await db.execute({
    sql: `SELECT interactions.*
       FROM interactions
       JOIN leads ON leads.id = interactions.lead_id
       WHERE leads.org_id = ? AND leads.id = ?
       ORDER BY occurred_at DESC`,
    args: [orgId, leadId],
  });
  return result.rows as unknown as Interaction[];
}

export async function createLead(
  orgId: number,
  userId: number,
  data: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    source_detail?: string | null;
    source_first_touch_at?: string | null;
    assigned_user_id?: number | null;
    owner_user_id?: number | null;
    price_min?: number | null;
    price_max?: number | null;
    has_kids?: number | null;
    vehicle?: string | null;
    lead_type?: "buyer" | "seller" | "rental" | "renter" | "buyer_seller" | "both" | null;
    timeline?: "0-3 months" | "3-6 months" | "6-12 months" | "unknown" | null;
    preapproved?: number | null;
    lender_name?: string | null;
    down_payment_range?: "5-10%" | "10-20%" | "20%+" | "unknown" | null;
    credit_confidence?: "low" | "medium" | "high" | "unknown" | null;
    bedrooms_min?: number | null;
    bathrooms_min?: number | null;
    property_type?:
      | "single_family"
      | "townhouse"
      | "condo"
      | "land"
      | "multi_family"
      | "other"
      | null;
    preferred_areas?: string | null;
    school_priority?: "low" | "medium" | "high" | "unknown" | null;
    commute_city?: string | null;
    commute_max_min?: number | null;
    work_from_home?: "yes" | "no" | "hybrid" | "unknown" | null;
    pets?: "dog" | "cat" | "both" | "none" | "unknown" | null;
    important_notes?: string | null;
    doc_preapproval_received?: number | null;
    doc_proof_of_funds_received?: number | null;
    doc_buyer_agency_signed?: number | null;
    doc_listing_agreement_signed?: number | null;
    doc_property_disclosures_received?: number | null;
    doc_hoa_docs_received?: number | null;
    doc_notes?: string | null;
    rent_min?: number | null;
    rent_max?: number | null;
    lease_start_date?: string | null;
    pets_allowed?: number | null;
    application_submitted?: number | null;
    landlord_contact_name?: string | null;
    landlord_contact_phone?: string | null;
    landlord_contact_email?: string | null;
    rental_notes?: string | null;
  }
) {
  const now = new Date().toISOString();
  const columns = [
    "user_id",
    "org_id",
    "owner_user_id",
    "assigned_user_id",
    "name",
    "phone",
    "email",
    "source",
    "stage",
    "created_at",
    "updated_at",
  ];
  const placeholders = ["?", "?", "?", "?", "?", "?", "?", "?", "'new'", "?", "?"];
  const args: (string | number | null)[] = [
    userId,
    orgId,
    data.owner_user_id ?? userId,
    data.assigned_user_id ?? null,
    data.name,
    data.phone ?? null,
    data.email ?? null,
    data.source ?? "unknown",
    now,
    now,
  ];

  const optionalEntries: [string, string | number | null | undefined][] = [
    ["price_min", data.price_min],
    ["price_max", data.price_max],
    ["has_kids", data.has_kids],
    ["vehicle", data.vehicle],
    ["lead_type", data.lead_type],
    ["timeline", data.timeline],
    ["preapproved", data.preapproved],
    ["lender_name", data.lender_name],
    ["down_payment_range", data.down_payment_range],
    ["credit_confidence", data.credit_confidence],
    ["bedrooms_min", data.bedrooms_min],
    ["bathrooms_min", data.bathrooms_min],
    ["property_type", data.property_type],
    ["preferred_areas", data.preferred_areas],
    ["school_priority", data.school_priority],
    ["commute_city", data.commute_city],
    ["commute_max_min", data.commute_max_min],
    ["work_from_home", data.work_from_home],
    ["pets", data.pets],
    ["important_notes", data.important_notes],
    ["doc_preapproval_received", data.doc_preapproval_received],
    ["doc_proof_of_funds_received", data.doc_proof_of_funds_received],
    ["doc_buyer_agency_signed", data.doc_buyer_agency_signed],
    ["doc_listing_agreement_signed", data.doc_listing_agreement_signed],
    ["doc_property_disclosures_received", data.doc_property_disclosures_received],
    ["doc_hoa_docs_received", data.doc_hoa_docs_received],
    ["doc_notes", data.doc_notes],
    ["rent_min", data.rent_min],
    ["rent_max", data.rent_max],
    ["lease_start_date", data.lease_start_date],
    ["pets_allowed", data.pets_allowed],
    ["application_submitted", data.application_submitted],
    ["landlord_contact_name", data.landlord_contact_name],
    ["landlord_contact_phone", data.landlord_contact_phone],
    ["landlord_contact_email", data.landlord_contact_email],
    ["rental_notes", data.rental_notes],
    ["source_detail", data.source_detail],
    ["source_first_touch_at", data.source_first_touch_at],
  ];

  optionalEntries.forEach(([column, value]) => {
    if (value !== undefined) {
      columns.push(column);
      placeholders.push("?");
      args.push(value ?? null);
    }
  });

  const result = await db.execute({
    sql: `INSERT INTO leads (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    args,
  });
  return Number(result.lastInsertRowid);
}

export async function updateLead(
  orgId: number,
  leadId: number,
  data: Partial<{
    stage: LeadStage;
    last_contacted_at: string | null;
    next_action_at: string | null;
    next_action_text: string | null;
    notes: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    source_detail: string | null;
    source_first_touch_at: string | null;
    price_min: number | null;
    price_max: number | null;
    has_kids: number | null;
    vehicle: string | null;
    lead_type: "buyer" | "seller" | "rental" | "renter" | "buyer_seller" | "both" | null;
    assigned_user_id: number | null;
    timeline: "0-3 months" | "3-6 months" | "6-12 months" | "unknown" | null;
    preapproved: number | null;
    lender_name: string | null;
    down_payment_range: "5-10%" | "10-20%" | "20%+" | "unknown" | null;
    credit_confidence: "low" | "medium" | "high" | "unknown" | null;
    bedrooms_min: number | null;
    bathrooms_min: number | null;
    property_type:
      | "single_family"
      | "townhouse"
      | "condo"
      | "land"
      | "multi_family"
      | "other"
      | null;
    preferred_areas: string | null;
    school_priority: "low" | "medium" | "high" | "unknown" | null;
    commute_city: string | null;
    commute_max_min: number | null;
    work_from_home: "yes" | "no" | "hybrid" | "unknown" | null;
    pets: "dog" | "cat" | "both" | "none" | "unknown" | null;
    important_notes: string | null;
    doc_preapproval_received: number | null;
    doc_proof_of_funds_received: number | null;
    doc_buyer_agency_signed: number | null;
    doc_listing_agreement_signed: number | null;
    doc_property_disclosures_received: number | null;
    doc_hoa_docs_received: number | null;
    doc_notes: string | null;
    rent_min: number | null;
    rent_max: number | null;
    lease_start_date: string | null;
    pets_allowed: number | null;
    application_submitted: number | null;
    landlord_contact_name: string | null;
    landlord_contact_phone: string | null;
    landlord_contact_email: string | null;
    rental_notes: string | null;
  }>
) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  });

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  values.push(leadId, orgId);

  const query = `UPDATE leads SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`;
  await db.execute({ sql: query, args: values });
}

export async function deleteLead(orgId: number, leadId: number) {
  await db.execute({
    sql: "DELETE FROM leads WHERE id = ? AND org_id = ?",
    args: [leadId, orgId],
  });
}

export async function addInteraction(
  orgId: number,
  userId: number,
  leadId: number,
  data: {
    type: InteractionType;
    content: string;
    occurred_at?: string;
  }
) {
  const lead = await getLead(orgId, leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  await db.execute({
    sql: `INSERT INTO interactions (lead_id, org_id, user_id, type, content, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      leadId,
      orgId,
      userId,
      data.type,
      data.content,
      data.occurred_at ?? new Date().toISOString(),
      new Date().toISOString(),
    ],
  });
}

export async function listSources(orgId: number) {
  const result = await db.execute({
    sql: "SELECT DISTINCT source FROM leads WHERE org_id = ? ORDER BY source ASC",
    args: [orgId],
  });
  return result.rows as unknown as { source: string }[];
}

export async function listReminders(
  orgId: number,
  owner_user_ids?: number[] | null
) {
  const ownerFilter =
    owner_user_ids && owner_user_ids.length > 0
      ? ` AND owner_user_id IN (${owner_user_ids.map(() => "?").join(", ")})`
      : "";
  const ownerArgs = owner_user_ids && owner_user_ids.length > 0 ? owner_user_ids : [];
  const overdueResult = await db.execute({
    sql: `SELECT * FROM leads
       WHERE org_id = ?
       ${ownerFilter}
       AND next_action_at IS NOT NULL
       AND date(next_action_at) < date('now')
       ORDER BY next_action_at ASC`,
    args: [orgId, ...ownerArgs],
  });

  const staleResult = await db.execute({
    sql: `SELECT * FROM leads
       WHERE org_id = ?
       ${ownerFilter}
       AND last_contacted_at IS NOT NULL
       AND datetime(last_contacted_at) < datetime('now', '-7 days')
       ORDER BY last_contacted_at ASC`,
    args: [orgId, ...ownerArgs],
  });

  return {
    overdue: overdueResult.rows as unknown as Lead[],
    stale: staleResult.rows as unknown as Lead[],
  };
}
