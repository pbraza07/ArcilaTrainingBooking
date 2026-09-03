import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reservationNumber: text("reservation_number").notNull(),
  service: text("service").notNull(),
  status: text("status").notNull().default("confirmed"),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  adultName: text("adult_name").notNull(),
  playerName: text("player_name").notNull(),
  playerAge: text("player_age").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  emergencyName: text("emergency_name").notNull(),
  emergencyPhone: text("emergency_phone").notNull(),
  notes: text("notes").notNull().default(""),
  partyGuests: integer("party_guests"),
  teamName: text("team_name"),
  ageGroup: text("age_group"),
  coachName: text("coach_name"),
  consentSms: integer("consent_sms", { mode: "boolean" }).notNull().default(false),
  acceptedPolicies: integer("accepted_policies", { mode: "boolean" }).notNull().default(false),
  publicToken: text("public_token").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_reservations_number").on(table.reservationNumber),
  uniqueIndex("idx_reservations_public_token").on(table.publicToken),
  index("idx_reservations_start_status").on(table.startAt, table.status),
  index("idx_reservations_created_at").on(table.createdAt),
]);

export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  reason: text("reason").notNull().default("Unavailable"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_availability_blocks_start").on(table.startAt)]);

export const notificationLog = sqliteTable("notification_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reservationId: integer("reservation_id"),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  event: text("event").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_notification_reservation").on(table.reservationId)]);

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  reservationId: integer("reservation_id"),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const dailyReports = sqliteTable("daily_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportDate: text("report_date").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_daily_reports_date_recipient").on(table.reportDate, table.recipient)]);
