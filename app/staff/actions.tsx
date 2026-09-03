"use client";

import { useState } from "react";
import { Check, X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StaffActions({ id, status }: { id: number; status: string }) {
  const [busy, setBusy] = useState(false);
  async function update(next: string) {
    setBusy(true);
    const response = await fetch(`/api/admin/reservations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    if (response.ok) window.location.reload(); else setBusy(false);
  }
  if (status !== "pending") return <span className="text-xs font-semibold text-black/40">No action needed</span>;
  return <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => update("confirmed")} className="bg-emerald-700 hover:bg-emerald-800"><Check /> Approve</Button><Button size="sm" disabled={busy} variant="outline" onClick={() => update("declined")}><X /> Decline</Button></div>;
}
