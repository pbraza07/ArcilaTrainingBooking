import { chmod, writeFile } from "node:fs/promises";

const destination = process.argv[2];
if (!destination) throw new Error("A destination environment-file path is required");

const workerVariables = [
  "ARCILA_ADMIN_EMAILS",
  "ARCILA_REPORT_EMAIL",
  "ARCILA_STAFF_PHONES",
  "ARCILA_STAFF_PASSWORD",
  "ARCILA_CRON_SECRET",
  "ARCILA_APP_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "RESEND_API_KEY",
  "ARCILA_FROM_EMAIL",
];

const contents = workerVariables
  .filter((key) => process.env[key] !== undefined && process.env[key] !== "")
  .map((key) => `${key}=${JSON.stringify(process.env[key])}`)
  .join("\n");

await writeFile(destination, `${contents}\n`, { mode: 0o600 });
await chmod(destination, 0o600);
