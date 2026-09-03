import { cookies } from "next/headers";
import { COOKIE_NAME, portableStaffSessionToken, verifyPortableStaffPassword } from "@/lib/staff-auth";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { password?: string };
  if (!payload.password || !(await verifyPortableStaffPassword(payload.password))) {
    return Response.json({ error: "Incorrect staff password" }, { status: 401 });
  }
  (await cookies()).set(COOKIE_NAME, await portableStaffSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true });
}
