# Order alerts — Davy Analytics

This integration sends an alert when a row is inserted into `public.orders`.
It uses a Supabase Database Webhook and an Edge Function. No provider credentials
belong in the public HTML or this repository.

## 1. Deploy the Edge Function

Deploy `supabase/functions/order-alert/index.ts` as function name `order-alert`
to the same Supabase project that contains the `public.orders` table. Keep
JWT verification disabled for this database webhook only. The function checks
the `apikey` header against the `SUPABASE_SECRET_KEY` Edge Function secret.

## 2. Add Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `SUPABASE_SECRET_KEY`: the project's Supabase secret key; keep it only in Edge Function Secrets.
- `RESEND_API_KEY`: Resend API key.
- `ORDER_ALERT_EMAIL`: email address that receives new-order alerts.
- `RESEND_FROM`: sender address on a domain verified in Resend, e.g. `Davy Analytics <orders@your-verified-domain>`.

Email sends only after the Resend domain is verified and these values are configured.

## 3. Configure the Database Webhook

In Supabase Dashboard → Database → Webhooks, create a webhook:

- Table: `public.orders`
- Event: `INSERT`
- Type: Supabase Edge Function
- Function: `order-alert`
- Method: `POST`
- Use the Dashboard option **Add secret key** so Supabase sends the project secret in the `apikey` header.
- Header: `Content-Type: application/json`

Do not paste the secret key into this repository or public HTML.

## 4. Optional WhatsApp Business notification

This uses Meta WhatsApp Business Platform Cloud API, not a personal WhatsApp account.
Create/configure a WhatsApp Business app and approved message template with four
body placeholders in this order: order number, customer name, product, amount.
Add these Edge Function secrets:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `ORDER_ALERT_WHATSAPP` (destination in international format, digits only)
- `ORDER_WA_TEMPLATE_NAME` (approved template name)
- `ORDER_WA_TEMPLATE_LANG` (template language code, e.g. `id`)

Template text and placeholder positions must match the approved Meta template.
Business-initiated alerts generally require an approved template; costs and
eligibility depend on Meta's current WhatsApp Business terms.

## 5. Test

Create one test order in the same project. Check Edge Function Logs and the
recipient inbox/WhatsApp. The function response reports provider HTTP status,
but a provider acceptance is not a guarantee of inbox delivery.

## Current limitation

The Admin Pesanan page reads `public.orders` and uses the Supabase project URL
already configured in that page. The notification function must be deployed to
that exact project. Confirm the project before deployment; do not deploy to
another Supabase project by mistake.
