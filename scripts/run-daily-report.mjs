const appUrl = process.env.ARCILA_APP_URL?.replace(/\/$/, "");
const secret = process.env.ARCILA_CRON_SECRET;

if (!appUrl || !secret) {
  throw new Error("ARCILA_APP_URL and ARCILA_CRON_SECRET are required");
}

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  hour12: false,
}).formatToParts(new Date());
const hour = Number(parts.find((part) => part.type === "hour")?.value);

if (hour !== 20) {
  console.log("Skipped: it is not 8:00 PM America/New_York.");
  process.exit(0);
}

const response = await fetch(`${appUrl}/api/reports/daily`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await response.text();
if (!response.ok) throw new Error(`Daily report failed (${response.status}): ${body}`);
console.log(body);
