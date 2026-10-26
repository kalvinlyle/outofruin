// CORS for the native app, which runs at https://localhost (Android) or
// capacitor://localhost (iOS) and so calls these functions cross-origin.
// Returns true when the request was a preflight and has been answered.
const NATIVE_ORIGINS = new Set(["https://localhost", "capacitor://localhost", "http://localhost"]);

module.exports = function cors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && NATIVE_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
};
