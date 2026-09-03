import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { notifyReservation } from "@/lib/notifications";
import { getPortableStaffUser } from "@/lib/staff-auth";

type RuntimeEnv = { DB: D1Database; ARCILA_ADMIN_EMAILS?: string };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  const portableUser = user ? null : await getPortableStaffUser();
  const runtime = env as unknown as RuntimeEnv;
  const admins = (runtime.ARCILA_ADMIN_EMAILS || "pbraza@gmail.com").split(",").map((email) => email.trim().toLowerCase());
  if ((!user || !admins.includes(user.email.toLowerCase())) && !portableUser) return Response.json({ error: "Staff access required" }, { status: 403 });
  const actor = user?.email || portableUser!.email;
  const { id } = await context.params;
  const payload = await request.json() as { status?: string };
  const allowed = ["confirmed", "modified", "cancelled", "completed", "no_show", "declined"];
  if (!payload.status || !allowed.includes(payload.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  const now = new Date().toISOString();
  const result = await runtime.DB.prepare("UPDATE reservations SET status=?, updated_at=? WHERE id=?")
    .bind(payload.status, now, Number(id)).run();
  if (!result.meta.changes) return Response.json({ error: "Reservation not found" }, { status: 404 });
  const row = await runtime.DB.prepare("SELECT * FROM reservations WHERE id=?").bind(Number(id)).first() as Parameters<typeof notifyReservation>[0];
  await runtime.DB.prepare("INSERT INTO audit_log (actor, action, reservation_id, details, created_at) VALUES (?,?,?,?,?)")
    .bind(actor, "status_changed", Number(id), JSON.stringify({ status: payload.status }), now).run();
  await notifyReservation(row, `booking ${payload.status}`);
  return Response.json({ ok: true });
}
