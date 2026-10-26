// GET -> { enabled }: whether real-money purchases can be taken. Until a
// Stripe key is configured the shop shows gold packs as unavailable rather
// than letting every purchase fail.
const { key, publishableKey } = require("./_stripe.js");

module.exports = (req, res) => {
  res.status(200).json({ enabled: Boolean(key() && publishableKey()) });
};
