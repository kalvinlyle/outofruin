// POST { pack } -> { id, clientSecret, publishableKey }: an embedded Stripe
// Checkout session for one gold pack, shown inside the game rather than on
// Stripe's own page. The price comes from packs.js, never from the request.
const STORE = require("../packs.js");
const { key, publishableKey, stripe } = require("./_stripe.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!key() || !publishableKey()) return res.status(503).json({ error: "not_configured" });

  const pack = STORE.packs.find((p) => p.id === (req.body && req.body.pack));
  if (!pack) return res.status(400).json({ error: "unknown_pack" });

  // Card payments finish inside the game; only payment methods that must
  // leave the page (bank redirects) come back through return_url.
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment",
      ui_mode: "embedded",
      redirect_on_completion: "if_required",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": STORE.currency,
      "line_items[0][price_data][unit_amount]": pack.amount,
      "line_items[0][price_data][product_data][name]": `${pack.gold.toLocaleString("en-US")} Gold`,
      "line_items[0][price_data][product_data][description]": "Gold for Out of Ruin",
      "metadata[pack]": pack.id,
      "payment_intent_data[metadata][pack]": pack.id,
      return_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
    return res.status(200).json({
      id: session.id,
      clientSecret: session.client_secret,
      publishableKey: publishableKey(),
    });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "stripe_error" });
  }
};
