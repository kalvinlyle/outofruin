// Minimal Stripe REST client: the two calls we need don't justify the SDK.
// Files starting with an underscore are not exposed as Vercel functions.
const API = "https://api.stripe.com/v1";

function key() {
  return process.env.STRIPE_SECRET_KEY || "";
}

async function stripe(method, path, params) {
  const init = {
    method,
    headers: { Authorization: `Bearer ${key()}` },
  };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params).toString();
  }
  const response = await fetch(API + path, init);
  const body = await response.json();
  if (!response.ok) {
    const message = body && body.error ? body.error.message : response.statusText;
    throw new Error(`Stripe ${method} ${path}: ${message}`);
  }
  return body;
}

module.exports = { key, stripe };
