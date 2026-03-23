"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { apiFetch, toNumberOrNull } from "@/components/lead-profile/api";

type RentalDeal = {
  id: number;
  role: "tenant_rep" | "landlord_rep";
  monthly_rent?: number | null;
  fee_type?: "one_month" | "percent" | "flat" | null;
  fee_value?: number | null;
  est_commission?: number | null;
  status: "pending" | "placed" | "lost";
};

type PropertyManagement = {
  id: number;
  monthly_rent?: number | null;
  management_percent?: number | null;
  monthly_management_fee?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: "active" | "ended";
};

type Props = {
  leadId: number;
};

export default function RentalsSection({ leadId }: Props) {
  const [rentals, setRentals] = useState<RentalDeal[]>([]);
  const [pmContracts, setPmContracts] = useState<PropertyManagement[]>([]);
  const [isPending, startTransition] = useTransition();
  const [editingRentalId, setEditingRentalId] = useState<number | null>(null);
  const [editingPmId, setEditingPmId] = useState<number | null>(null);

  const [rentalForm, setRentalForm] = useState<Partial<RentalDeal>>({
    role: "tenant_rep",
    status: "pending",
  });

  const [pmForm, setPmForm] = useState<Partial<PropertyManagement>>({
    status: "active",
  });

  useEffect(() => {
    startTransition(async () => {
      const [rentalsData, pmData] = await Promise.all([
        apiFetch<RentalDeal[]>(`/api/leads/${leadId}/rentals`).catch(() => []),
        apiFetch<PropertyManagement[]>(`/api/leads/${leadId}/property-management`).catch(
          () => []
        ),
      ]);
      setRentals(rentalsData);
      setPmContracts(pmData);
    });
  }, [leadId]);

  const pendingRental = useMemo(() => {
    return rentals
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + (r.est_commission || 0), 0);
  }, [rentals]);

  const activePmTotal = useMemo(() => {
    return pmContracts
      .filter((p) => p.status === "active")
      .reduce((sum, p) => sum + (p.monthly_management_fee || 0), 0);
  }, [pmContracts]);

  const submitRental = async () => {
    if (editingRentalId) {
      await apiFetch(`/api/rentals/${editingRentalId}`, {
        method: "PATCH",
        body: JSON.stringify(rentalForm),
      });
    } else {
      await apiFetch(`/api/leads/${leadId}/rentals`, {
        method: "POST",
        body: JSON.stringify(rentalForm),
      });
    }
    const list = await apiFetch<RentalDeal[]>(`/api/leads/${leadId}/rentals`);
    setRentals(list);
    setRentalForm({ role: "tenant_rep", status: "pending" });
    setEditingRentalId(null);
  };

  const deleteRental = async (id: number) => {
    await apiFetch(`/api/rentals/${id}`, { method: "DELETE" });
    setRentals((prev) => prev.filter((r) => r.id !== id));
  };

  const submitPm = async () => {
    if (editingPmId) {
      await apiFetch(`/api/property-management/${editingPmId}`, {
        method: "PATCH",
        body: JSON.stringify(pmForm),
      });
    } else {
      await apiFetch(`/api/leads/${leadId}/property-management`, {
        method: "POST",
        body: JSON.stringify(pmForm),
      });
    }
    const list = await apiFetch<PropertyManagement[]>(
      `/api/leads/${leadId}/property-management`
    );
    setPmContracts(list);
    setPmForm({ status: "active" });
    setEditingPmId(null);
  };

  const deletePm = async (id: number) => {
    await apiFetch(`/api/property-management/${id}`, { method: "DELETE" });
    setPmContracts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Rentals</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase text-slate-400">Pending Rental Commission</p>
          <p className="text-lg font-semibold">${pendingRental.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase text-slate-400">Active PM Monthly Fees</p>
          <p className="text-lg font-semibold">${activePmTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2 text-left">Role</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Monthly</th>
              <th className="py-2 text-left">Est Commission</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rentals.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-slate-400">
                  No rental deals yet.
                </td>
              </tr>
            ) : (
              rentals.map((rental) => (
                <tr key={rental.id} className="border-t border-slate-100">
                  <td className="py-2">{rental.role.replace("_", " ")}</td>
                  <td className="py-2">{rental.status}</td>
                  <td className="py-2">
                    {rental.monthly_rent ? `$${rental.monthly_rent.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2">
                    {rental.est_commission
                      ? `$${rental.est_commission.toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="py-2 space-x-2">
                    <button
                      type="button"
                      className="text-xs text-slate-600 hover:text-slate-900"
                      onClick={() => {
                        setEditingRentalId(rental.id);
                        setRentalForm({ ...rental });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={() => deleteRental(rental.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-slate-100 p-3 space-y-3">
        <h3 className="text-sm font-medium">{editingRentalId ? "Edit Rental" : "Add Rental"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Role</label>
            <select
              className="mt-2 w-full"
              value={rentalForm.role ?? "tenant_rep"}
              onChange={(event) =>
                setRentalForm((prev) => ({
                  ...prev,
                  role: event.target.value as RentalDeal["role"],
                }))
              }
            >
              <option value="tenant_rep">Tenant rep</option>
              <option value="landlord_rep">Landlord rep</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              className="mt-2 w-full"
              value={rentalForm.status ?? "pending"}
              onChange={(event) =>
                setRentalForm((prev) => ({
                  ...prev,
                  status: event.target.value as RentalDeal["status"],
                }))
              }
            >
              <option value="pending">Pending</option>
              <option value="placed">Placed</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Monthly rent</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={rentalForm.monthly_rent ?? ""}
              onChange={(event) =>
                setRentalForm((prev) => ({
                  ...prev,
                  monthly_rent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fee type</label>
            <select
              className="mt-2 w-full"
              value={rentalForm.fee_type ?? ""}
              onChange={(event) =>
                setRentalForm((prev) => ({
                  ...prev,
                  fee_type: event.target.value as RentalDeal["fee_type"],
                }))
              }
            >
              <option value="">Unknown</option>
              <option value="one_month">One month</option>
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fee value</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={rentalForm.fee_value ?? ""}
              onChange={(event) =>
                setRentalForm((prev) => ({
                  ...prev,
                  fee_value: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={submitRental}
          disabled={isPending}
        >
          {editingRentalId ? "Save Rental" : "Add Rental"}
        </button>
      </div>

      <div className="rounded-md border border-slate-100 p-3 space-y-3">
        <h3 className="text-sm font-medium">
          {editingPmId ? "Edit Property Management" : "Add Property Management"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Monthly rent</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={pmForm.monthly_rent ?? ""}
              onChange={(event) =>
                setPmForm((prev) => ({
                  ...prev,
                  monthly_rent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Management %</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={pmForm.management_percent ?? ""}
              onChange={(event) =>
                setPmForm((prev) => ({
                  ...prev,
                  management_percent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Start date</label>
            <input
              type="date"
              className="mt-2 w-full"
              value={pmForm.start_date?.split("T")[0] ?? ""}
              onChange={(event) => setPmForm((prev) => ({ ...prev, start_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">End date</label>
            <input
              type="date"
              className="mt-2 w-full"
              value={pmForm.end_date?.split("T")[0] ?? ""}
              onChange={(event) => setPmForm((prev) => ({ ...prev, end_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              className="mt-2 w-full"
              value={pmForm.status ?? "active"}
              onChange={(event) =>
                setPmForm((prev) => ({
                  ...prev,
                  status: event.target.value as PropertyManagement["status"],
                }))
              }
            >
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={submitPm}
          disabled={isPending}
        >
          {editingPmId ? "Save Contract" : "Add Contract"}
        </button>
      </div>
    </section>
  );
}
