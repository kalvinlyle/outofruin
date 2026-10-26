// POST { product, token } -> { status, gold? }: whether a Google Play purchase
// made in the Android app is real and still owed its gold.
//
//   granted   paid and not yet consumed: grant `gold`; the app then consumes it
//   consumed  already delivered: forget the token
//   pending   the payment has not cleared (e.g. cash at a shop): ask again later
//   invalid   cancelled, refunded, or unknown to Google: forget the token
//
// The app grants before it consumes, so a crash between the two re-grants on
// the next launch rather than losing a paid purchase. See docs/play-billing.md.
const STORE = require("../packs.js");
const cors = require("./_cors.js");
const { PACKAGE, configured, getPurchase } = require("./_play.js");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!configured()) {
    res.status(503).json({ error: "Play purchases are not configured" });
    return;
  }
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const pack = STORE.packs.find((p) => p.id === body.product);
  const token = typeof body.token === "string" ? body.token : "";
  if (!pack || !token || token.length > 4096) {
    res.status(400).json({ error: "unknown product or token" });
    return;
  }
  try {
    const p = await getPurchase(pack.id, token);
    // purchaseState: 0 purchased, 1 cancelled, 2 pending. consumptionState: 0 not consumed.
    if (!p || p.purchaseState === 1) return res.status(200).json({ status: "invalid" });
    if (p.purchaseState === 2) return res.status(200).json({ status: "pending" });
    if (p.consumptionState === 1) return res.status(200).json({ status: "consumed" });
    console.log("[play] granted", JSON.stringify({ product: pack.id, order: p.orderId || null, package: PACKAGE }));
    res.status(200).json({ status: "granted", gold: pack.gold });
  } catch (err) {
    console.error("[play] claim failed", err.message);
    res.status(502).json({ error: "could not reach Google Play" });
  }
};

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
