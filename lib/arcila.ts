export const TIME_ZONE = "America/New_York";

export const SERVICES = {
  private: { label: "Private Training", minutes: 60, pending: false },
  small_group: { label: "Small Group", minutes: 60, pending: false },
  birthday: { label: "Birthday Party", minutes: 180, pending: true },
  team_club: { label: "Team / Club Practice", minutes: 75, pending: true },
} as const;

export type ServiceKey = keyof typeof SERVICES;

export function isService(value: unknown): value is ServiceKey {
  return typeof value === "string" && value in SERVICES;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return normalized.length === 10 ? `+1${normalized}` : "";
}

export function reservationNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `AT-${stamp}-${random}`;
}

export function formatEastern(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(new Date(value));
}

export function easternDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
