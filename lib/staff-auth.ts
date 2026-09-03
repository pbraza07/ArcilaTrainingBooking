import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

const COOKIE_NAME = "arcila_staff_session";
const encoder = new TextEncoder();

type StaffEnv = { ARCILA_STAFF_PASSWORD?: string };

function configuredPassword() {
  return (env as unknown as StaffEnv).ARCILA_STAFF_PASSWORD?.trim() || "";
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function portableStaffAuthEnabled() {
  return configuredPassword().length >= 12;
}

export async function verifyPortableStaffPassword(candidate: string) {
  const expected = configuredPassword();
  if (expected.length < 12 || candidate.length < 12) return false;
  return constantTimeEqual(await digest(candidate), await digest(expected));
}

export async function portableStaffSessionToken() {
  const password = configuredPassword();
  return password ? digest(`arcila-training-staff:${password}`) : "";
}

export async function getPortableStaffUser() {
  if (!portableStaffAuthEnabled()) return null;
  const supplied = (await cookies()).get(COOKIE_NAME)?.value || "";
  const expected = await portableStaffSessionToken();
  if (!supplied || !constantTimeEqual(supplied, expected)) return null;
  return { displayName: "Arcila Staff", email: "render-staff@arcila.local", fullName: "Arcila Staff" };
}

export { COOKIE_NAME };
