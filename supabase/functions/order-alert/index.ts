// Supabase Database Webhook: POST on INSERT to public.orders
// Keep all provider credentials in Supabase Edge Function Secrets.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-office-webhook-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const expected = Deno.env.get("OFFICE_WEBHOOK_SECRET");
  const supplied = req.headers.get("x-office-webhook-secret");
  if (!expected || !supplied || supplied !== expected) return json({ error: "Unauthorized webhook" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const order = payload?.record ?? payload?.data?.record ?? payload;
  if (!order || typeof order !== "object") return json({ error: "Missing order record" }, 400);

  const orderNo = String(order.order_number ?? order.id ?? "N/A");
  const customer = String(order.customer_name ?? "Pelanggan");
  const product = String(order.product ?? "Produk");
  const currency = String(order.currency ?? "IDR");
  const amount = Number(order.budget);
  const amountText = Number.isFinite(amount) ? new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount) : String(order.budget ?? "-");
  const details = [
    "Pesanan baru masuk ke Davy Analytics.",
    "Nomor: " + orderNo,
    "Pelanggan: " + customer,
    "Email: " + String(order.customer_email ?? "-"),
    "Telepon: " + String(order.customer_phone ?? "-"),
    "Produk: " + product,
    "Nilai: " + amountText,
    "Status: " + String(order.status ?? "Pesanan Baru"),
  ].join("\n");

  const results: Record<string, unknown> = {};
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const toEmail = Deno.env.get("ORDER_ALERT_EMAIL");
  const fromEmail = Deno.env.get("RESEND_FROM");
  if (resendKey && toEmail && fromEmail) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail, to: [toEmail], subject: "Pesanan baru " + orderNo,
          text: details,
        }),
      });
      results.email = { sent: response.ok, status: response.status };
    } catch (e) { results.email = { sent: false, error: String(e) }; }
  } else results.email = { skipped: true, reason: "Email secrets not configured" };

  // WhatsApp Cloud API: outbound business notifications should use an approved
  // template. Configure ORDER_WA_TEMPLATE_NAME and ORDER_WA_TEMPLATE_LANG.
  const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const waTo = Deno.env.get("ORDER_ALERT_WHATSAPP");
  const template = Deno.env.get("ORDER_WA_TEMPLATE_NAME");
  const language = Deno.env.get("ORDER_WA_TEMPLATE_LANG") ?? "id";
  if (waToken && waPhoneId && waTo && template) {
    try {
      const response = await fetch("https://graph.facebook.com/v23.0/" + waPhoneId + "/messages", {
        method: "POST",
        headers: { "Authorization": "Bearer " + waToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: waTo, type: "template",
          template: { name: template, language: { code: language }, components: [{
            type: "body", parameters: [
              { type: "text", text: orderNo }, { type: "text", text: customer },
              { type: "text", text: product }, { type: "text", text: amountText },
            ],
          }] },
        }),
      });
      const data = await response.json().catch(() => ({}));
      results.whatsapp = { sent: response.ok, status: response.status, response: data };
    } catch (e) { results.whatsapp = { sent: false, error: String(e) }; }
  } else results.whatsapp = { skipped: true, reason: "WhatsApp Cloud API secrets/template not configured" };

  return json({ ok: true, order: orderNo, notifications: results });
});
