import { env } from "cloudflare:workers";
import { CalendarClock, CircleAlert, LogOut, Users, PartyPopper } from "lucide-react";
import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { getPortableStaffUser, portableStaffAuthEnabled } from "@/lib/staff-auth";
import { StaffActions } from "./actions";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB: D1Database; ARCILA_ADMIN_EMAILS?: string };
type Row = { id: number; reservation_number: string; service: string; status: string; start_at: string; end_at: string; adult_name: string; player_name: string; phone: string; email: string; created_at: string };

function when(value: string) { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function serviceName(value: string) { return ({ private: "Private Training", small_group: "Small Group", birthday: "Birthday Party", team_club: "Team / Club" } as Record<string,string>)[value] || value; }

export default async function StaffPage() {
  const runtime = env as unknown as RuntimeEnv;
  const chatGPTUser = await getChatGPTUser();
  const portableUser = chatGPTUser ? null : await getPortableStaffUser();
  if (!chatGPTUser && !portableUser) {
    redirect(portableStaffAuthEnabled() ? "/staff/login" : chatGPTSignInPath("/staff"));
  }
  const user = chatGPTUser ?? portableUser!;
  const admins = (runtime.ARCILA_ADMIN_EMAILS || "pbraza@gmail.com").split(",").map((email) => email.trim().toLowerCase());
  if (chatGPTUser && !admins.includes(user.email.toLowerCase())) return <main className="grid min-h-screen place-items-center bg-[#111] p-6 text-white"><div className="max-w-md text-center"><CircleAlert className="mx-auto size-10 text-[#ce1d2c]"/><h1 className="mt-5 text-2xl font-black">Staff access required</h1><p className="mt-3 text-white/60">This signed-in account is not on the Arcila Training administrator list.</p></div></main>;
  const result = await runtime.DB.prepare("SELECT * FROM reservations ORDER BY start_at ASC LIMIT 250").all<Row>();
  const rows = result.results;
  const active = rows.filter((row) => !["cancelled","declined","completed","no_show"].includes(row.status));
  const pending = rows.filter((row) => row.status === "pending").length;
  const upcoming = active.filter((row) => new Date(row.start_at) >= new Date()).length;
  const players = active.filter((row) => eventDate(row.start_at) === eventDate(new Date().toISOString())).length;
  const parties = active.filter((row) => row.service === "birthday").length;
  return <main className="min-h-screen bg-[#f3f3f2] text-[#111]">
    <header className="bg-[#111] text-white"><div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#ce1d2c]">Arcila Training</p><h1 className="text-2xl font-black">Staff schedule</h1></div><div className="flex items-center gap-4 text-sm"><span className="hidden text-white/55 sm:inline">{user.displayName}</span><a href={portableUser ? "/api/staff/logout" : chatGPTSignOutPath("/")} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2"><LogOut className="size-4"/> Sign out</a></div></div></header>
    <div className="mx-auto max-w-[1400px] px-5 py-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={CalendarClock} label="Upcoming sessions" value={upcoming}/><Metric icon={Users} label="Players today" value={players}/><Metric icon={CircleAlert} label="Pending approval" value={pending}/><Metric icon={PartyPopper} label="Upcoming parties" value={parties}/></div>
      <section className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-white"><div className="border-b border-black/10 px-5 py-4"><h2 className="text-lg font-black">Master reservation list</h2><p className="text-sm text-black/45">Customer details are visible only in this protected staff area.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f7f7f6] text-xs uppercase tracking-wider text-black/45"><tr><th className="px-5 py-3">Reservation</th><th className="px-5 py-3">Session</th><th className="px-5 py-3">Player / contact</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t border-black/7"><td className="px-5 py-4 font-mono text-xs font-bold">{row.reservation_number}</td><td className="px-5 py-4"><b>{serviceName(row.service)}</b><br/><span className="text-black/45">{when(row.start_at)}–{when(row.end_at).split(", ").pop()}</span></td><td className="px-5 py-4"><b>{row.player_name}</b><br/><span className="text-black/45">{row.adult_name} · {row.email}</span></td><td className="px-5 py-4"><span className={`status-${row.status} rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide`}>{row.status}</span></td><td className="px-5 py-4">{row.phone}</td><td className="px-5 py-4"><StaffActions id={row.id} status={row.status}/></td></tr>) : <tr><td className="px-5 py-12 text-center text-black/45" colSpan={6}>No reservations yet.</td></tr>}</tbody></table></div></section>
    </div>
  </main>;
}

function eventDate(value: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(value)); }
function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <div className="rounded-xl border border-black/10 bg-white p-5"><Icon className="size-5 text-[#ce1d2c]"/><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-black/45">{label}</p></div>; }
