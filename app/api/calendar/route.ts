import { env } from "cloudflare:workers";

type RuntimeEnv = { DB: D1Database };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "A valid month is required" }, { status: 400 });
  }
  const from = new Date(`${month}-01T00:00:00-04:00`);
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const db = (env as unknown as RuntimeEnv).DB;
  const result = await db.prepare(`SELECT
      MIN(id) AS id, MIN(reservation_number) AS reservation_number, service, status, start_at, end_at,
      COUNT(*) AS booked
    FROM reservations
    WHERE start_at >= ? AND start_at < ? AND status NOT IN ('cancelled','declined')
    GROUP BY CASE WHEN service = 'small_group' THEN 'group-' || start_at ELSE 'reservation-' || id END,
      service, status, start_at, end_at
    ORDER BY start_at ASC`)
    .bind(from.toISOString(), to.toISOString()).all();
  return Response.json({ events: result.results });
}
