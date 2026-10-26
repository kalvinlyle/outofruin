// Minimal Stripe REST client: the two calls we need don't justify the SDK.
// Files starting with an underscore are not exposed as Vercel functions.
const STORE = require("../packs.js");

const API = "https://api.stripe.com/v1";

function key() {
  return process.env.STRIPE_SECRET_KEY || "";
}

// The publishable key that pairs with the secret one: the sandbox's for a
// test key, the live account's for a live key. Publishable keys are public.
function publishableKey() {
  const mode = /^[sr]k_live_/.test(key()) ? "live" : "test";
  return STORE.publishableKeys[mode] || "";
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

module.exports = { key, publishableKey, stripe };
