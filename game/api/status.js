// GET -> { enabled }: whether real-money purchases can be taken on the web. Until a
// Stripe key is configured the shop shows gold packs as unavailable rather than
// letting every purchase fail. The Android app sells through Google Play instead.
const { key, publishableKey } = require("./_stripe.js");
const cors = require("./_cors.js");

module.exports = (req, res) => {
  if (cors(req, res)) return;
  res.status(200).json({ enabled: Boolean(key() && publishableKey()) });
};
