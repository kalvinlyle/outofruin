// POST { session } -> { status, gold }
//   granted  paid and not yet claimed: grant `gold`, and it's now marked claimed
//   claimed  already granted once; grant nothing
//   pending  checkout still open; ask again later
//   void     expired or unpaid; forget it
//
// Saves live in the player's browser, so there's no account to credit. The
// claim mark lives on the Stripe payment itself, which keeps a refresh or a
// second tab from granting the same purchase twice.
const STORE = require("../packs.js");
const { key, stripe } = require("./_stripe.js");

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!key()) return res.status(503).json({ error: "not_configured" });

  const id = req.body && req.body.session;
  if (!SESSION_ID.test(id || "")) return res.status(400).json({ error: "bad_session" });

  try {
    const session = await stripe("GET", `/checkout/sessions/${id}?expand[]=payment_intent`);
    if (session.payment_status !== "paid") {
      return res.status(200).json({ status: session.status === "open" ? "pending" : "void", gold: 0 });
    }

    const intent = session.payment_intent;
    if (intent.metadata && intent.metadata.oor_claimed) {
      return res.status(200).json({ status: "claimed", gold: 0 });
    }

    const pack = STORE.packs.find((p) => p.id === session.metadata.pack);
    if (!pack) return res.status(200).json({ status: "void", gold: 0 });

    await stripe("POST", `/payment_intents/${intent.id}`, {
      "metadata[oor_claimed]": new Date().toISOString(),
    });
    return res.status(200).json({ status: "granted", gold: pack.gold });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "stripe_error" });
  }
};
