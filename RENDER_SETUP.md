# Arcila Training — Render Setup

This package uses a Render Blueprint so the web service, persistent booking database, and daily report schedule are created together.

## Before you begin

You need:

- A GitHub account
- A Render account connected to GitHub
- The Arcila Training project pushed to a GitHub repository
- A Twilio account and messaging-capable phone number for SMS notifications
- A Resend account and verified sending domain for email notifications

## 1. Upload the project to GitHub

1. Download and unzip the Arcila Training package.
2. On GitHub, select **New repository**.
3. Name it `arcila-training-booking`.
4. Choose **Private** unless you intentionally want the source code public.
5. Do not add a README, `.gitignore`, or license because the package already contains them.
6. Follow GitHub's **push an existing repository** instructions from inside the unzipped folder.

## 2. Create the Render Blueprint

1. Sign in to Render.
2. Select **New +** and then **Blueprint**.
3. Connect the GitHub repository containing this project.
4. Render will detect `render.yaml` and propose two services:
   - `arcila-training-booking` — the public booking app
   - `arcila-daily-booking-report` — the hourly check that sends the 8:00 PM Eastern report
5. Enter the environment-variable values described below.
6. Select **Apply** or **Deploy Blueprint**.

## 3. Required environment variables

### Web service

| Variable | What to enter |
| --- | --- |
| `ARCILA_STAFF_PASSWORD` | A unique password with at least 12 characters for `/staff` |
| `ARCILA_CRON_SECRET` | A long random secret; use the exact same value on the cron service |
| `ARCILA_APP_URL` | Initially use `https://arcila-training-booking.onrender.com`; correct it after Render shows the final URL |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Twilio sending number in `+1...` format |
| `RESEND_API_KEY` | Resend API key |
| `ARCILA_FROM_EMAIL` | A sender on a verified domain, such as `Arcila Training <bookings@yourdomain.com>` |

The Blueprint already sets the report email and both Arcila staff phone numbers. You may edit those values in Render later.

### Cron service

| Variable | What to enter |
| --- | --- |
| `ARCILA_APP_URL` | The final URL of the Render web service, with no trailing slash |
| `ARCILA_CRON_SECRET` | Exactly the same secret used on the web service |

## 4. Correct the final URL

After the first web deployment:

1. Open the `arcila-training-booking` service in Render.
2. Copy the public `https://...onrender.com` URL shown near the service name.
3. Open **Environment** and set `ARCILA_APP_URL` to that exact URL without a trailing `/`.
4. Open the `arcila-daily-booking-report` service and set its `ARCILA_APP_URL` to the same URL.
5. Save the changes and allow Render to redeploy.

## 5. Verify the deployment

1. Open the Render URL and confirm the booking calendar loads.
2. Open `/staff` and sign in with `ARCILA_STAFF_PASSWORD`.
3. Create one test reservation with a real email and phone number you control.
4. Confirm the reservation appears on the calendar and in `/staff`.
5. Check the Render logs for the web service and confirm there are no database or notification errors.
6. In Twilio and Resend, confirm the test notifications were accepted.

## 6. Daily report behavior

Render cron schedules use UTC. The included cron runs at the top of every hour, checks the current time in `America/New_York`, and sends the report only when the local hour is 8:00 PM. This keeps the report aligned with Eastern Time through daylight-saving changes.

The report is sent to `pbraza@gmail.com` by default. Change `ARCILA_REPORT_EMAIL` on the web service if needed.

## Important limitations

- The 1 GB persistent disk requires a paid Render web-service plan.
- Do not remove the disk unless you accept losing reservations after a restart or redeployment.
- Twilio trial accounts can send only to verified recipients and may add trial wording.
- Resend requires a verified sending domain for production delivery.
- Render deployment does not copy existing booking records from ChatGPT Sites; it starts with a separate empty database.
- The ChatGPT Sites URL and the Render URL are separate deployments and do not automatically synchronize bookings.
