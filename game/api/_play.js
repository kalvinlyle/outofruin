// Minimal Google Play Developer API client for checking gold purchases made in
// the Android app. A service account with Play Console access to the app, as
// JSON in GOOGLE_PLAY_SERVICE_ACCOUNT, signs its own token: no SDK needed.
// Files starting with an underscore are not exposed as Vercel functions.
const crypto = require("node:crypto");

const PACKAGE = "games.misaligned.outofruin";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function account() {
  try {
    const a = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || "");
    return a && a.client_email && a.private_key ? a : null;
  } catch {
    return null;
  }
}

const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let cached = null; // { token, exp }

async function accessToken() {
  const a = account();
  if (!a) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT is not set");
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: a.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64url(crypto.sign("RSA-SHA256", Buffer.from(`${head}.${claims}`), a.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${sig}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google token: ${body.error_description || body.error || res.statusText}`);
  cached = { token: body.access_token, exp: now + Number(body.expires_in || 3600) };
  return cached.token;
}

/**
 * The purchase record for one in-app product token, or null when Google does
 * not know the token (a forged or foreign one).
 */
async function getPurchase(productId, token) {
  const url = `${API}/applications/${PACKAGE}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (res.status === 404 || res.status === 400 || res.status === 410) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(`Play purchases.products.get: ${body.error ? body.error.message : res.statusText}`);
  return body;
}

module.exports = { PACKAGE, configured: () => Boolean(account()), getPurchase };
