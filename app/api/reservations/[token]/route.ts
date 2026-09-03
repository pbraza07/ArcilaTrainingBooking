import { env } from "cloudflare:workers";

type RuntimeEnv = { DB: D1Database };

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const db = (env as unknown as RuntimeEnv).DB;
  const row = await db.prepare(`SELECT reservation_number, service, status, start_at, end_at, adult_name, player_name, email, phone, notes
    FROM reservations WHERE public_token = ?`).bind(token).first();
  return row ? Response.json({ reservation: row }) : Response.json({ error: "Reservation not found" }, { status: 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const db = (env as unknown as RuntimeEnv).DB;
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE reservations SET status='cancelled', updated_at=?
    WHERE public_token=? AND status NOT IN ('cancelled','completed','no_show')`).bind(now, token).run();
  return result.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Reservation cannot be cancelled" }, { status: 409 });
}
