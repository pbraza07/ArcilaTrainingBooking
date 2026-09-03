"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StaffLoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) window.location.assign("/staff");
    else {
      const payload = await response.json().catch(() => ({ error: "Sign-in failed" })) as { error?: string };
      setError(payload.error || "Sign-in failed");
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#111] p-5 text-white"><form onSubmit={signIn} className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-7 shadow-2xl"><ShieldCheck className="size-9 text-[#ce1d2c]"/><p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-[#ce1d2c]">Arcila Training</p><h1 className="mt-1 text-3xl font-black">Staff sign in</h1><p className="mt-3 text-sm leading-6 text-white/55">Enter the staff password configured for this deployment.</p><label className="mt-6 grid gap-2 text-sm font-bold"><span>Password</span><Input name="password" type="password" autoComplete="current-password" minLength={12} required className="bg-white text-black"/></label>{error && <p role="alert" className="mt-3 text-sm font-bold text-red-300">{error}</p>}<Button disabled={busy} className="mt-5 h-11 w-full bg-[#ce1d2c] font-black hover:bg-[#b71927]">{busy ? "Signing in…" : "Sign in"}</Button><a href="/" className="mt-5 block text-center text-sm text-white/50 hover:text-white">Return to booking calendar</a></form></main>;
}
