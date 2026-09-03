import { env } from "cloudflare:workers";
import { easternDateKey } from "@/lib/arcila";

type RuntimeEnv = { DB: D1Database; ARCILA_CRON_SECRET?: string; RESEND_API_KEY?: string; ARCILA_FROM_EMAIL?: string; ARCILA_REPORT_EMAIL?: string };
type Row = { reservation_number: string; service: string; status: string; player_name: string; adult_name: string; start_at: string; end_at: string; phone: string; email: string; created_at: string; updated_at: string; notes: string };

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function dateBoundary(dateKey: string, next = false) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + (next ? 1 : 0), 16));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" }).formatToParts(probe);
  const offset = (parts.find((part) => part.type === "timeZoneName")?.value || "GMT-04:00").replace("GMT", "");
  const target = new Date(Date.UTC(year, month - 1, day + (next ? 1 : 0)));
  const key = `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,"0")}-${String(target.getUTCDate()).padStart(2,"0")}`;
  return new Date(`${key}T00:00:00${offset}`).toISOString();
}

export async function POST(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.ARCILA_CRON_SECRET || request.headers.get("authorization") !== `Bearer ${runtime.ARCILA_CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const reportDate = url.searchParams.get("date") || easternDateKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return Response.json({ error: "Invalid report date" }, { status: 400 });
  const recipient = runtime.ARCILA_REPORT_EMAIL || "pbraza@gmail.com";
  const result = await runtime.DB.prepare(`SELECT reservation_number, service, status, player_name, adult_name, start_at, end_at, phone, email, created_at, updated_at, notes
    FROM reservations WHERE (created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?) ORDER BY status, start_at`)
    .bind(dateBoundary(reportDate), dateBoundary(reportDate, true), dateBoundary(reportDate), dateBoundary(reportDate, true)).all<Row>();
  const rows = result.results;
  const counts = {
    total: rows.length,
    confirmed: rows.filter((row) => row.status === "confirmed").length,
    pending: rows.filter((row) => row.status === "pending").length,
    modified: rows.filter((row) => row.status === "modified").length,
    cancelled: rows.filter((row) => row.status === "cancelled").length,
    private: rows.filter((row) => row.service === "private").length,
    group: rows.filter((row) => row.service === "small_group").length,
    birthday: rows.filter((row) => row.service === "birthday").length,
    team: rows.filter((row) => row.service === "team_club").length,
  };
  const headings = ["Reservation","Service","Status","Player","Booked By","Scheduled Start","Scheduled End","Phone","Email","Submitted","Notes"];
  const csv = [headings, ...rows.map((row) => [row.reservation_number,row.service,row.status,row.player_name,row.adult_name,row.start_at,row.end_at,row.phone,row.email,row.created_at,row.notes])].map((line) => line.map(csvCell).join(",")).join("\n");
  const table = rows.length ? `<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${headings.slice(0,7).map((heading) => `<th style="padding:8px;border:1px solid #ddd;text-align:left">${heading}</th>`).join("")}</tr>${rows.map((row) => `<tr><td style="padding:8px;border:1px solid #ddd">${row.reservation_number}</td><td style="padding:8px;border:1px solid #ddd">${row.service}</td><td style="padding:8px;border:1px solid #ddd">${row.status}</td><td style="padding:8px;border:1px solid #ddd">${row.player_name}</td><td style="padding:8px;border:1px solid #ddd">${row.adult_name}</td><td style="padding:8px;border:1px solid #ddd">${row.start_at}</td><td style="padding:8px;border:1px solid #ddd">${row.end_at}</td></tr>`).join("")}</table>` : `<p><b>No booking activity was recorded today.</b></p>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:900px"><div style="background:#111;color:white;padding:22px"><b style="font-size:24px;color:#ce1d2c">ARCILA</b> <b style="font-size:24px">TRAINING</b><div style="margin-top:6px">Daily booking report · ${reportDate}</div></div><div style="padding:22px"><p><b>New/activity:</b> ${counts.total} &nbsp; <b>Confirmed:</b> ${counts.confirmed} &nbsp; <b>Pending:</b> ${counts.pending} &nbsp; <b>Modified:</b> ${counts.modified} &nbsp; <b>Cancelled:</b> ${counts.cancelled}</p><p><b>Private:</b> ${counts.private} &nbsp; <b>Small group players:</b> ${counts.group} &nbsp; <b>Birthday:</b> ${counts.birthday} &nbsp; <b>Team/club:</b> ${counts.team}</p>${table}</div></div>`;
  if (!runtime.RESEND_API_KEY || !runtime.ARCILA_FROM_EMAIL) return Response.json({ error: "Email configuration required", preview: { reportDate, recipient, counts } }, { status: 503 });
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: runtime.ARCILA_FROM_EMAIL, to: [recipient], subject: `Arcila Training daily booking report — ${reportDate}`, html, attachments: [{ filename: `arcila-bookings-${reportDate}.csv`, content: btoa(unescape(encodeURIComponent(csv))) }] }) });
  const payload = await response.json() as { id?: string; message?: string };
  await runtime.DB.prepare("INSERT OR REPLACE INTO daily_reports (report_date, recipient, status, provider_id, error, created_at) VALUES (?,?,?,?,?,?)")
    .bind(reportDate, recipient, response.ok ? "accepted" : "failed", payload.id || null, response.ok ? null : payload.message || "Email failed", new Date().toISOString()).run();
  return Response.json({ ok: response.ok, reportDate, recipient, counts }, { status: response.ok ? 200 : 502 });
}
