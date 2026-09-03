import { env } from "cloudflare:workers";
import { SERVICES, formatEastern, normalizePhone, type ServiceKey } from "./arcila";

type ReservationNotice = {
  id: number;
  reservation_number: string;
  service: ServiceKey;
  status: string;
  start_at: string;
  end_at: string;
  adult_name: string;
  player_name: string;
  phone: string;
  email: string;
};

type RuntimeEnv = {
  DB: D1Database;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  RESEND_API_KEY?: string;
  ARCILA_FROM_EMAIL?: string;
  ARCILA_STAFF_PHONES?: string;
  ARCILA_APP_URL?: string;
};

const runtime = env as unknown as RuntimeEnv;

async function logNotification(row: ReservationNotice, channel: string, recipient: string, event: string, status: string, providerId?: string, error?: string) {
  await runtime.DB.prepare(`INSERT INTO notification_log
    (reservation_id, channel, recipient, event, status, provider_id, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(row.id, channel, recipient, event, status, providerId ?? null, error ?? null, new Date().toISOString())
    .run();
}

async function sendSms(row: ReservationNotice, recipient: string, message: string, event: string) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = runtime;
  if (!sid || !token || !from) {
    await logNotification(row, "sms", recipient, event, "configuration_required", undefined, "Twilio credentials are not configured");
    return;
  }
  try {
    const body = new URLSearchParams({ To: recipient, From: from, Body: message });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await response.json() as { sid?: string; message?: string };
    await logNotification(row, "sms", recipient, event, response.ok ? "accepted" : "failed", payload.sid, response.ok ? undefined : payload.message);
  } catch (error) {
    await logNotification(row, "sms", recipient, event, "failed", undefined, error instanceof Error ? error.message : "Unknown SMS error");
  }
}

async function sendEmail(row: ReservationNotice, recipient: string, subject: string, html: string, event: string) {
  if (!runtime.RESEND_API_KEY || !runtime.ARCILA_FROM_EMAIL) {
    await logNotification(row, "email", recipient, event, "configuration_required", undefined, "Email credentials are not configured");
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: runtime.ARCILA_FROM_EMAIL, to: [recipient], subject, html }),
    });
    const payload = await response.json() as { id?: string; message?: string };
    await logNotification(row, "email", recipient, event, response.ok ? "accepted" : "failed", payload.id, response.ok ? undefined : payload.message);
  } catch (error) {
    await logNotification(row, "email", recipient, event, "failed", undefined, error instanceof Error ? error.message : "Unknown email error");
  }
}

export async function notifyReservation(row: ReservationNotice, event: string) {
  const service = SERVICES[row.service].label;
  const when = `${formatEastern(row.start_at)}–${formatEastern(row.end_at, { hour: "numeric", minute: "2-digit" })}`;
  const contacts = "(813) 458-5324 or (813) 750-9062";
  const manageUrl = runtime.ARCILA_APP_URL ? `${runtime.ARCILA_APP_URL}/reservation/${row.reservation_number}` : "";
  const customerMessage = `Arcila Training: ${row.status}. ${service} on ${when}. Reservation ${row.reservation_number}. Questions: ${contacts}. ${manageUrl}`;
  const staffMessage = `Arcila ${event}: ${row.reservation_number} | ${service} | ${row.player_name || row.adult_name} | ${when} | ${row.status} | ${row.phone}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:620px"><div style="background:#0b0b0b;padding:22px;color:white"><b style="color:#ce1d2c;font-size:24px">ARCILA</b> <b style="font-size:24px">TRAINING</b></div><div style="padding:24px;border:1px solid #ddd"><h2 style="margin-top:0">Reservation ${row.status}</h2><p><b>${service}</b><br>${when}</p><p>Reservation: <b>${row.reservation_number}</b></p><p>Player: ${row.player_name}<br>Booked by: ${row.adult_name}</p><p>Questions? Call or text ${contacts}.</p>${manageUrl ? `<p><a href="${manageUrl}" style="background:#ce1d2c;color:white;padding:12px 18px;text-decoration:none">Manage reservation</a></p>` : ""}</div></div>`;

  await sendEmail(row, row.email, `Arcila Training — ${service} ${row.status}`, html, event);
  if (row.status === "confirmed") {
    const customerPhone = normalizePhone(row.phone);
    if (customerPhone) await sendSms(row, customerPhone, customerMessage, event);
    const staffPhones = (runtime.ARCILA_STAFF_PHONES || "+18134585324,+18137509062").split(",").map(normalizePhone).filter(Boolean);
    await Promise.all(staffPhones.map((phone) => sendSms(row, phone, staffMessage, event)));
  }
}
