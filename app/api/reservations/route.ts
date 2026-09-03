import { env } from "cloudflare:workers";
import { SERVICES, isService, normalizePhone, reservationNumber } from "@/lib/arcila";
import { notifyReservation } from "@/lib/notifications";

type RuntimeEnv = { DB: D1Database };
type Payload = Record<string, unknown>;

const requiredText = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  const payload = await request.json() as Payload;
  if (!isService(payload.service)) return Response.json({ error: "Select a valid service" }, { status: 400 });

  const service = payload.service;
  const adultName = requiredText(payload.adultName);
  const playerName = requiredText(payload.playerName);
  const playerAge = requiredText(payload.playerAge);
  const phone = normalizePhone(requiredText(payload.phone));
  const email = requiredText(payload.email).toLowerCase();
  const emergencyName = requiredText(payload.emergencyName);
  const emergencyPhone = normalizePhone(requiredText(payload.emergencyPhone));
  const start = new Date(requiredText(payload.startAt));
  const acceptedPolicies = payload.acceptedPolicies === true;
  if (!adultName || !playerName || !playerAge || !phone || !emergencyName || !emergencyPhone || !/^\S+@\S+\.\S+$/.test(email) || Number.isNaN(start.getTime()) || !acceptedPolicies) {
    return Response.json({ error: "Complete all required contact, player, emergency, and policy fields" }, { status: 400 });
  }
  if (start.getTime() < Date.now() + 30 * 60 * 1000) {
    return Response.json({ error: "Please select a future time at least 30 minutes from now" }, { status: 400 });
  }

  const startAt = start.toISOString();
  const endAt = new Date(start.getTime() + SERVICES[service].minutes * 60_000).toISOString();
  const status = SERVICES[service].pending ? "pending" : "confirmed";
  const number = reservationNumber();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = (env as unknown as RuntimeEnv).DB;
  const commonSql = `INSERT INTO reservations
    (reservation_number, service, status, start_at, end_at, adult_name, player_name, player_age,
     phone, email, emergency_name, emergency_phone, notes, party_guests, team_name, age_group,
     coach_name, consent_sms, accepted_policies, public_token, created_at, updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?`;
  const values = [number, service, status, startAt, endAt, adultName, playerName, playerAge, phone, email,
    emergencyName, emergencyPhone, requiredText(payload.notes), Number(payload.partyGuests) || null,
    requiredText(payload.teamName) || null, requiredText(payload.ageGroup) || null,
    requiredText(payload.coachName) || null, payload.consentSms === true ? 1 : 0, 1, token, now, now];

  let result;
  if (service === "small_group") {
    result = await db.prepare(`${commonSql}
      WHERE NOT EXISTS (
        SELECT 1 FROM availability_blocks b WHERE b.start_at < ? AND b.end_at > ?
      )
      AND NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.status NOT IN ('cancelled','declined') AND r.start_at < ? AND r.end_at > ?
          AND (r.service != 'small_group' OR r.start_at != ? OR r.end_at != ?)
      )
      AND (SELECT COUNT(*) FROM reservations r
        WHERE r.service='small_group' AND r.start_at=? AND r.status NOT IN ('cancelled','declined')) < 7`)
      .bind(...values, endAt, startAt, endAt, startAt, startAt, endAt, startAt).run();
  } else {
    result = await db.prepare(`${commonSql}
      WHERE NOT EXISTS (
        SELECT 1 FROM availability_blocks b WHERE b.start_at < ? AND b.end_at > ?
      )
      AND NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.status NOT IN ('cancelled','declined') AND r.start_at < ? AND r.end_at > ?
      )`)
      .bind(...values, endAt, startAt, endAt, startAt).run();
  }
  if (!result.meta.changes) {
    return Response.json({ error: service === "small_group" ? "This group session is full or conflicts with another event" : "That time is no longer available" }, { status: 409 });
  }

  const rowResult = await db.prepare(`SELECT * FROM reservations WHERE reservation_number = ?`).bind(number).first();
  const row = rowResult as Parameters<typeof notifyReservation>[0];
  await db.prepare(`INSERT INTO audit_log (actor, action, reservation_id, details, created_at) VALUES (?,?,?,?,?)`)
    .bind(email, "reservation_created", row.id, JSON.stringify({ service, status }), now).run();
  await notifyReservation(row, "booking created");
  return Response.json({ reservation: { number, token, service, status, startAt, endAt } }, { status: 201 });
}
