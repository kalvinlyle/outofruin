// GET -> { enabled, play }: whether real-money purchases can be taken. `enabled`
// is Stripe (web); `play` is Google Play Billing in the Android app, which needs
// the service account that verifies purchases. Until one is configured the shop
// shows its gold packs as unavailable rather than letting every purchase fail.
const { key, publishableKey } = require("./_stripe.js");
const cors = require("./_cors.js");
const play = require("./_play.js");

module.exports = (req, res) => {
  if (cors(req, res)) return;
  res.status(200).json({ enabled: Boolean(key() && publishableKey()), play: play.configured() });
};
