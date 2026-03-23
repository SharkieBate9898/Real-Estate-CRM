import Link from "next/link";
import { redirect } from "next/navigation";
import { getLead, listInteractions } from "@/lib/leads";
import { canAccessLead, getCurrentUserContext, listOrgMembers } from "@/lib/org";
import { interactionTypes } from "@/lib/db";
import { leadStages } from "@/lib/leadStages";
import LeadProfileExtras from "@/components/LeadProfileExtras";
import LeadTypeSelector from "@/components/lead-profile/LeadTypeSelector";
import { LeadTypeGate, LeadTypeProvider } from "@/components/lead-profile/LeadTypeContext";
import {
  updateStage,
  saveNotes,
  updateNextAction,
  markContacted,
  addLeadInteraction,
  removeLead,
  updateLeadDetails,
  updateContactInfo,
  updateAssignment,
} from "@/app/app/leads/[id]/actions";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const leadId = Number(params.id);
  const access = await canAccessLead(ctx, leadId);
  if (!access) {
    redirect("/app");
  }
  const lead = await getLead(ctx.orgId, leadId);
  if (!lead) {
    redirect("/app");
  }
  const interactions = await listInteractions(ctx.orgId, leadId);
  const members = await listOrgMembers(ctx.orgId);
  const activeMembers = members.filter((member) => member.status === "active");
  const ownerEmail = members.find((member) => member.user_id === lead.owner_user_id)?.email;
  const assignedEmail = members.find((member) => member.user_id === lead.assigned_user_id)?.email;

  return (
    <LeadTypeProvider initialLeadType={lead.lead_type}>
      <div className="space-y-6 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div>
            <Link href="/app" className="group inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">
              <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Pipeline
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{lead.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {lead.source}
              </span>
              {ctx.role === "admin" ? (
                <>
                  <span>&bull;</span>
                  <span>Owner: {ownerEmail ?? "Unassigned"}</span>
                  {assignedEmail ? (
                    <>
                      <span>&bull;</span>
                      <span>Assigned: {assignedEmail}</span>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <form action={updateStage} method="post" className="flex w-full items-center gap-2 sm:w-auto">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="stage" defaultValue={lead.stage} className="w-full font-medium sm:w-auto py-2">
                {leadStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                Move
              </button>
            </form>
            <form action={removeLead} method="post">
              <input type="hidden" name="leadId" value={lead.id} />
              <button type="submit" className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 sm:w-auto dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                Delete
              </button>
            </form>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800/60 dark:text-slate-400">Contact</h2>
              <form action={updateContactInfo} method="post" className="mt-4 space-y-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input
                      name="phone"
                      className="mt-1.5 w-full py-2.5"
                      defaultValue={lead.phone ?? ""}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input
                      name="email"
                      type="email"
                      className="mt-1.5 w-full py-2.5"
                      defaultValue={lead.email ?? ""}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Save Contact Info
                  </button>
                </div>
              </form>
              <div className="mt-5 border-t border-slate-100 pt-5 flex flex-wrap gap-2 text-sm dark:border-slate-800/60">
                {lead.phone ? (
                  <>
                    <a
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      href={`tel:${lead.phone}`}
                    >
                      Call
                    </a>
                    <a
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      href={`sms:${lead.phone}`}
                    >
                      Text
                    </a>
                  </>
                ) : null}
                {lead.email ? (
                  <a
                    className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    href={`mailto:${lead.email}`}
                  >
                    Email
                  </a>
                ) : null}
              </div>
              <form action={markContacted} method="post" className="mt-5">
                <input type="hidden" name="leadId" value={lead.id} />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Mark Contacted Today
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Next Action</h2>
              <form action={updateNextAction} method="post" className="mt-3 space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div>
                  <label className="text-sm font-medium">Next action date</label>
                  <input
                    type="date"
                    name="next_action_at"
                    defaultValue={lead.next_action_at?.split("T")[0]}
                    className="mt-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Next action detail</label>
                  <input
                    name="next_action_text"
                    defaultValue={lead.next_action_text ?? ""}
                    className="mt-2 w-full"
                    placeholder="Call about open house results"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Save Next Action
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Notes</h2>
              <form action={saveNotes} method="post" className="mt-3 space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <textarea
                  name="notes"
                  defaultValue={lead.notes ?? ""}
                  rows={4}
                  className="w-full"
                  placeholder="Add notes about preferences, timelines, or deal details..."
                />
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Save Notes
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Lead Type</h2>
              <div className="mt-3">
                <LeadTypeSelector leadId={lead.id} initialLeadType={lead.lead_type} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Assignment</h2>
              <form action={updateAssignment} method="post" className="mt-3 space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div>
                  <label className="text-sm font-medium">Assigned to</label>
                  <select
                    name="assigned_user_id"
                    className="mt-2 w-full"
                    defaultValue={lead.assigned_user_id ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {activeMembers.map((member) => (
                      <option key={member.id} value={member.user_id}>
                        {member.email}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Save Assignment
                </button>
              </form>
            </div>

            <LeadTypeGate allow={["buyer", "buyer_seller"]}>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Buyer Details</h2>
                <form action={updateLeadDetails} method="post" className="mt-3 space-y-6">
                  <input type="hidden" name="leadId" value={lead.id} />

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">Basics</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Timeline</label>
                        <select
                          name="timeline"
                          className="mt-2 w-full"
                          defaultValue={lead.timeline ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="0-3 months">0-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6-12 months">6-12 months</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Has kids</label>
                        <select
                          name="has_kids"
                          className="mt-2 w-full"
                          defaultValue={
                            lead.has_kids === null || lead.has_kids === undefined
                              ? ""
                              : String(lead.has_kids)
                          }
                        >
                          <option value="">Unknown</option>
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Vehicle</label>
                        <input
                          name="vehicle"
                          className="mt-2 w-full"
                          defaultValue={lead.vehicle ?? ""}
                          placeholder="SUV, sedan, truck..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Pets</label>
                        <select
                          name="pets"
                          className="mt-2 w-full"
                          defaultValue={lead.pets ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          <option value="both">Both</option>
                          <option value="none">None</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Work from home</label>
                        <select
                          name="work_from_home"
                          className="mt-2 w-full"
                          defaultValue={lead.work_from_home ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">Financing</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Price min</label>
                        <input
                          type="number"
                          name="price_min"
                          className="mt-2 w-full"
                          defaultValue={lead.price_min ?? ""}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Price max</label>
                        <input
                          type="number"
                          name="price_max"
                          className="mt-2 w-full"
                          defaultValue={lead.price_max ?? ""}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Preapproved</label>
                        <select
                          name="preapproved"
                          className="mt-2 w-full"
                          defaultValue={
                            lead.preapproved === null || lead.preapproved === undefined
                              ? ""
                              : String(lead.preapproved)
                          }
                        >
                          <option value="">Unknown</option>
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Lender name</label>
                        <input
                          name="lender_name"
                          className="mt-2 w-full"
                          defaultValue={lead.lender_name ?? ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Down payment range</label>
                        <select
                          name="down_payment_range"
                          className="mt-2 w-full"
                          defaultValue={lead.down_payment_range ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="5-10%">5-10%</option>
                          <option value="10-20%">10-20%</option>
                          <option value="20%+">20%+</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Credit confidence</label>
                        <select
                          name="credit_confidence"
                          className="mt-2 w-full"
                          defaultValue={lead.credit_confidence ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">Home Criteria</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Bedrooms min</label>
                        <input
                          type="number"
                          name="bedrooms_min"
                          className="mt-2 w-full"
                          defaultValue={lead.bedrooms_min ?? ""}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Bathrooms min</label>
                        <input
                          type="number"
                          name="bathrooms_min"
                          className="mt-2 w-full"
                          defaultValue={lead.bathrooms_min ?? ""}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Property type</label>
                        <select
                          name="property_type"
                          className="mt-2 w-full"
                          defaultValue={lead.property_type ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="single_family">Single family</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="condo">Condo</option>
                          <option value="land">Land</option>
                          <option value="multi_family">Multi-family</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">School priority</label>
                        <select
                          name="school_priority"
                          className="mt-2 w-full"
                          defaultValue={lead.school_priority ?? ""}
                        >
                          <option value="">Unknown</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="unknown">Unknown (explicit)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Preferred areas</label>
                        <textarea
                          name="preferred_areas"
                          className="mt-2 w-full"
                          rows={3}
                          defaultValue={lead.preferred_areas ?? ""}
                          placeholder="Neighborhoods, zip codes, landmarks..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">Lifestyle</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Commute city</label>
                        <input
                          name="commute_city"
                          className="mt-2 w-full"
                          defaultValue={lead.commute_city ?? ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Commute max minutes</label>
                        <input
                          type="number"
                          name="commute_max_min"
                          className="mt-2 w-full"
                          defaultValue={lead.commute_max_min ?? ""}
                          min={0}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Important notes</label>
                        <textarea
                          name="important_notes"
                          className="mt-2 w-full"
                          rows={3}
                          defaultValue={lead.important_notes ?? ""}
                          placeholder="Must-haves, deal breakers, lifestyle notes..."
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    Save Buyer Details
                  </button>
                </form>
              </div>
            </LeadTypeGate>

            <LeadTypeGate allow={["buyer", "seller", "buyer_seller"]}>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Document Tracker</h2>
                <form action={updateLeadDetails} method="post" className="mt-3 space-y-4">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <LeadTypeGate allow={["buyer", "buyer_seller"]}>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_preapproval_received" value="0" />
                        <input
                          type="checkbox"
                          name="doc_preapproval_received"
                          value="1"
                          defaultChecked={lead.doc_preapproval_received === 1}
                        />
                        Pre-approval letter received
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_proof_of_funds_received" value="0" />
                        <input
                          type="checkbox"
                          name="doc_proof_of_funds_received"
                          value="1"
                          defaultChecked={lead.doc_proof_of_funds_received === 1}
                        />
                        Proof of funds received
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_buyer_agency_signed" value="0" />
                        <input
                          type="checkbox"
                          name="doc_buyer_agency_signed"
                          value="1"
                          defaultChecked={lead.doc_buyer_agency_signed === 1}
                        />
                        Buyer agency signed
                      </label>
                    </div>
                  </LeadTypeGate>

                  <LeadTypeGate allow={["seller", "buyer_seller"]}>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_listing_agreement_signed" value="0" />
                        <input
                          type="checkbox"
                          name="doc_listing_agreement_signed"
                          value="1"
                          defaultChecked={lead.doc_listing_agreement_signed === 1}
                        />
                        Listing agreement signed
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_property_disclosures_received" value="0" />
                        <input
                          type="checkbox"
                          name="doc_property_disclosures_received"
                          value="1"
                          defaultChecked={lead.doc_property_disclosures_received === 1}
                        />
                        Property disclosures received
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="doc_hoa_docs_received" value="0" />
                        <input
                          type="checkbox"
                          name="doc_hoa_docs_received"
                          value="1"
                          defaultChecked={lead.doc_hoa_docs_received === 1}
                        />
                        HOA docs received
                      </label>
                    </div>
                  </LeadTypeGate>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      name="doc_notes"
                      className="mt-2 w-full"
                      rows={3}
                      defaultValue={lead.doc_notes ?? ""}
                      placeholder="Add notes about missing docs or follow-ups..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    Save Document Tracker
                  </button>
                </form>
              </div>
            </LeadTypeGate>

            <LeadTypeGate allow={["renter"]}>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Rental Details</h2>
                <form action={updateLeadDetails} method="post" className="mt-3 space-y-4">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Rent min</label>
                      <input
                        type="number"
                        name="rent_min"
                        className="mt-2 w-full"
                        min={0}
                        defaultValue={lead.rent_min ?? ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rent max</label>
                      <input
                        type="number"
                        name="rent_max"
                        className="mt-2 w-full"
                        min={0}
                        defaultValue={lead.rent_max ?? ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Lease start date</label>
                      <input
                        type="date"
                        name="lease_start_date"
                        className="mt-2 w-full"
                        defaultValue={lead.lease_start_date ?? ""}
                      />
                    </div>
                    <div className="space-y-2 pt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="pets_allowed" value="0" />
                        <input
                          type="checkbox"
                          name="pets_allowed"
                          value="1"
                          defaultChecked={lead.pets_allowed === 1}
                        />
                        Pets allowed
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="application_submitted" value="0" />
                        <input
                          type="checkbox"
                          name="application_submitted"
                          value="1"
                          defaultChecked={lead.application_submitted === 1}
                        />
                        Application submitted
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Landlord contact name</label>
                      <input
                        name="landlord_contact_name"
                        className="mt-2 w-full"
                        defaultValue={lead.landlord_contact_name ?? ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Landlord contact phone</label>
                      <input
                        name="landlord_contact_phone"
                        className="mt-2 w-full"
                        defaultValue={lead.landlord_contact_phone ?? ""}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Landlord contact email</label>
                      <input
                        type="email"
                        name="landlord_contact_email"
                        className="mt-2 w-full"
                        defaultValue={lead.landlord_contact_email ?? ""}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Rental notes</label>
                      <textarea
                        name="rental_notes"
                        className="mt-2 w-full"
                        rows={3}
                        defaultValue={lead.rental_notes ?? ""}
                        placeholder="Preferences, restrictions, lease notes..."
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    Save Rental Details
                  </button>
                </form>
              </div>
            </LeadTypeGate>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Log Interaction</h2>
              <form action={addLeadInteraction} method="post" className="mt-3 space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select name="type" className="mt-2 w-full">
                    {interactionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <input type="date" name="occurred_at" className="mt-2 w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium">Summary</label>
                  <textarea
                    name="content"
                    className="mt-2 w-full"
                    rows={3}
                    placeholder="Summary of the conversation or note"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Add Interaction
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Interactions</h2>
              <div className="mt-3 space-y-3">
                {interactions.length === 0 ? (
                  <p className="text-sm text-slate-400">No interactions yet.</p>
                ) : (
                  interactions.map((interaction) => (
                    <div key={interaction.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-400">
                        {interaction.type}  -  {new Date(interaction.occurred_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{interaction.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <LeadProfileExtras
          leadId={lead.id}
          initialSource={{
            source: lead.source,
            source_detail: lead.source_detail,
            source_first_touch_at: lead.source_first_touch_at,
          }}
        />
      </div >
    </LeadTypeProvider >
  );
}

