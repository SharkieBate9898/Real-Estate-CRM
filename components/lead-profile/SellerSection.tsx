"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch, toNumberOrNull } from "@/components/lead-profile/api";

type SellerProfile = {
  id: number;
  property_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  estimated_value?: number | null;
  mortgage_balance?: number | null;
  motivation_level?: number | null;
  condition_score?: number | null;
  listing_readiness?: "not_ready" | "getting_ready" | "ready" | null;
  target_list_date?: string | null;
  has_hoa?: number | null;
  hoa_notes?: string | null;
};

type ChecklistItem = {
  id: number;
  label: string;
  is_done: number;
  due_date?: string | null;
  notes?: string | null;
};

type Props = {
  leadId: number;
};

export default function SellerSection({ leadId }: Props) {
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const sp = await apiFetch<SellerProfile | null>(`/api/leads/${leadId}/seller-profile`).catch(
        () => null
      );
      setSellerProfile(sp);
      if (sp?.id) {
        const items = await apiFetch<ChecklistItem[]>(
          `/api/seller-profile/${sp.id}/checklist`
        ).catch(() => []);
        setChecklist(items);
      }
    });
  }, [leadId]);

  const createSellerProfile = async () => {
    const sp = await apiFetch<SellerProfile>(`/api/leads/${leadId}/seller-profile`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setSellerProfile(sp);
    const items = await apiFetch<ChecklistItem[]>(`/api/seller-profile/${sp.id}/checklist`);
    setChecklist(items);
  };

  const saveSellerProfile = async () => {
    if (!sellerProfile) return;
    await apiFetch(`/api/seller-profile/${sellerProfile.id}`, {
      method: "PATCH",
      body: JSON.stringify(sellerProfile),
    });
  };

  const toggleChecklist = async (item: ChecklistItem) => {
    const next = item.is_done ? 0 : 1;
    await apiFetch(`/api/checklist-items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: next }),
    });
    setChecklist((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_done: next } : row))
    );
  };

  const saveChecklistItem = async (item: ChecklistItem) => {
    await apiFetch(`/api/checklist-items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ due_date: item.due_date ?? null, notes: item.notes ?? null }),
    });
  };

  const addChecklistItem = async () => {
    if (!sellerProfile || !newChecklistLabel.trim()) return;
    await apiFetch(`/api/seller-profile/${sellerProfile.id}/checklist`, {
      method: "POST",
      body: JSON.stringify({ label: newChecklistLabel.trim() }),
    });
    const items = await apiFetch<ChecklistItem[]>(
      `/api/seller-profile/${sellerProfile.id}/checklist`
    );
    setChecklist(items);
    setNewChecklistLabel("");
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Seller</h2>
        {!sellerProfile ? (
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={createSellerProfile}
            disabled={isPending}
          >
            Create Seller Profile
          </button>
        ) : null}
      </div>
      {!sellerProfile ? (
        <p className="text-sm text-slate-500">No seller profile yet.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Property address</label>
              <input
                className="mt-2 w-full"
                value={sellerProfile.property_address ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev ? { ...prev, property_address: event.target.value } : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">City</label>
              <input
                className="mt-2 w-full"
                value={sellerProfile.city ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) => (prev ? { ...prev, city: event.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">State</label>
              <input
                className="mt-2 w-full"
                value={sellerProfile.state ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) => (prev ? { ...prev, state: event.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Zip</label>
              <input
                className="mt-2 w-full"
                value={sellerProfile.zip ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) => (prev ? { ...prev, zip: event.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Estimated value</label>
              <input
                type="number"
                className="mt-2 w-full"
                value={sellerProfile.estimated_value ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          estimated_value: toNumberOrNull(event.target.value),
                        }
                      : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Mortgage balance</label>
              <input
                type="number"
                className="mt-2 w-full"
                value={sellerProfile.mortgage_balance ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          mortgage_balance: toNumberOrNull(event.target.value),
                        }
                      : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Motivation (1-5)</label>
              <input
                type="number"
                className="mt-2 w-full"
                value={sellerProfile.motivation_level ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          motivation_level: toNumberOrNull(event.target.value),
                        }
                      : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Condition (1-5)</label>
              <input
                type="number"
                className="mt-2 w-full"
                value={sellerProfile.condition_score ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          condition_score: toNumberOrNull(event.target.value),
                        }
                      : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Readiness</label>
              <select
                className="mt-2 w-full"
                value={sellerProfile.listing_readiness ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          listing_readiness:
                            event.target.value as SellerProfile["listing_readiness"],
                        }
                      : prev
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="not_ready">Not ready</option>
                <option value="getting_ready">Getting ready</option>
                <option value="ready">Ready</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Target list date</label>
              <input
                type="date"
                className="mt-2 w-full"
                value={sellerProfile.target_list_date?.split("T")[0] ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev ? { ...prev, target_list_date: event.target.value } : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">HOA</label>
              <select
                className="mt-2 w-full"
                value={
                  sellerProfile.has_hoa === null || sellerProfile.has_hoa === undefined
                    ? ""
                    : String(sellerProfile.has_hoa)
                }
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          has_hoa:
                            event.target.value === ""
                              ? null
                              : toNumberOrNull(event.target.value),
                        }
                      : prev
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-slate-500">HOA notes</label>
              <input
                className="mt-2 w-full"
                value={sellerProfile.hoa_notes ?? ""}
                onChange={(event) =>
                  setSellerProfile((prev) =>
                    prev ? { ...prev, hoa_notes: event.target.value } : prev
                  )
                }
              />
            </div>
          </div>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={saveSellerProfile}
          >
            Save Seller Profile
          </button>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Checklist</h3>
            {checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(item.is_done)}
                      onChange={() => toggleChecklist(item)}
                    />
                    {item.label}
                  </label>
                  <button
                    type="button"
                    className="text-xs text-slate-500"
                    onClick={() => saveChecklistItem(item)}
                  >
                    Save
                  </button>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-500">Due date</label>
                    <input
                      type="date"
                      className="mt-1 w-full"
                      value={item.due_date?.split("T")[0] ?? ""}
                      onChange={(event) =>
                        setChecklist((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, due_date: event.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Notes</label>
                    <input
                      className="mt-1 w-full"
                      value={item.notes ?? ""}
                      onChange={(event) =>
                        setChecklist((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, notes: event.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                className="w-full"
                placeholder="Add checklist item"
                value={newChecklistLabel}
                onChange={(event) => setNewChecklistLabel(event.target.value)}
              />
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={addChecklistItem}
                disabled={isPending}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
