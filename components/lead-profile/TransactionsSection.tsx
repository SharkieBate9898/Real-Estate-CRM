"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { apiFetch, toNumberOrNull } from "@/components/lead-profile/api";

type Transaction = {
  id: number;
  type: "buyer_sale" | "seller_sale";
  status: "pending" | "under_contract" | "closed" | "lost";
  purchase_price?: number | null;
  commission_percent?: number | null;
  broker_split_percent?: number | null;
  referral_fee_percent?: number | null;
  est_net_commission?: number | null;
  closing_date?: string | null;
  notes?: string | null;
};

type Props = {
  leadId: number;
};

export default function TransactionsSection({ leadId }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>({
    type: "buyer_sale",
    status: "pending",
  });

  useEffect(() => {
    startTransition(async () => {
      const tx = await apiFetch<Transaction[]>(`/api/leads/${leadId}/transactions`).catch(
        () => []
      );
      setTransactions(tx);
    });
  }, [leadId]);

  const pendingNet = useMemo(() => {
    return transactions
      .filter((t) => t.status === "pending" || t.status === "under_contract")
      .reduce((sum, t) => sum + (t.est_net_commission || 0), 0);
  }, [transactions]);

  const closedNetYtd = useMemo(() => {
    const year = new Date().getFullYear();
    return transactions
      .filter((t) => t.status === "closed" && t.closing_date?.startsWith(String(year)))
      .reduce((sum, t) => sum + (t.est_net_commission || 0), 0);
  }, [transactions]);

  const submit = async () => {
    if (editingId) {
      await apiFetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch(`/api/leads/${leadId}/transactions`, {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    const tx = await apiFetch<Transaction[]>(`/api/leads/${leadId}/transactions`);
    setTransactions(tx);
    setForm({ type: "buyer_sale", status: "pending" });
    setEditingId(null);
  };

  const remove = async (id: number) => {
    await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Transactions</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase text-slate-400">Pending Net</p>
          <p className="text-lg font-semibold">${pendingNet.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase text-slate-400">Closed Net YTD</p>
          <p className="text-lg font-semibold">${closedNetYtd.toLocaleString()}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Price</th>
              <th className="py-2 text-left">Est Net</th>
              <th className="py-2 text-left">Closing</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-slate-400">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-slate-100">
                  <td className="py-2">{tx.type.replace("_", " ")}</td>
                  <td className="py-2">{tx.status.replace("_", " ")}</td>
                  <td className="py-2">
                    {tx.purchase_price ? `$${tx.purchase_price.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2">
                    {tx.est_net_commission ? `$${tx.est_net_commission.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2">{tx.closing_date?.split("T")[0] ?? "-"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs text-slate-600 hover:text-slate-900"
                        onClick={() => {
                          setEditingId(tx.id);
                          setForm({ ...tx });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-800"
                        onClick={() => remove(tx.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="rounded-md border border-slate-100 p-3 space-y-3">
        <h3 className="text-sm font-medium">
          {editingId ? "Edit Transaction" : "Add Transaction"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Type</label>
            <select
              className="mt-2 w-full"
              value={form.type ?? "buyer_sale"}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value as Transaction["type"] }))
              }
            >
              <option value="buyer_sale">Buyer sale</option>
              <option value="seller_sale">Seller sale</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              className="mt-2 w-full"
              value={form.status ?? "pending"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as Transaction["status"],
                }))
              }
            >
              <option value="pending">Pending</option>
              <option value="under_contract">Under contract</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Purchase price</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={form.purchase_price ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, purchase_price: toNumberOrNull(event.target.value) }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Commission %</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={form.commission_percent ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  commission_percent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Broker split %</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={form.broker_split_percent ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  broker_split_percent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Referral fee %</label>
            <input
              type="number"
              className="mt-2 w-full"
              value={form.referral_fee_percent ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  referral_fee_percent: toNumberOrNull(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Closing date</label>
            <input
              type="date"
              className="mt-2 w-full"
              value={form.closing_date?.split("T")[0] ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, closing_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <input
              className="mt-2 w-full"
              value={form.notes ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={submit}
            disabled={isPending}
          >
            {editingId ? "Save Transaction" : "Add Transaction"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              onClick={() => {
                setEditingId(null);
                setForm({ type: "buyer_sale", status: "pending" });
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
