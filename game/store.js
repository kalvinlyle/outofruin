// The game's side of real-money purchases. Lua talks to it through
// html5.run: OOR_STORE.price(id) for card labels, OOR_STORE.buy(id) to open
// the payment popup, and OOR_STORE.take() each tick for anything to act on
// ({"gold": n} to grant, {"error": true} to report, {"products": true} when
// prices became available and the shop should relabel, {"shown": true} or
// {"closed": true} as the popup opens and closes).
(function () {
  // The native app sells gold through its store's own billing (port/src/systems/play-store.ts).
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
  var PACKS = window.OOR_PACKS;
  var PENDING_KEY = "oor.checkouts";
  var PENDING_MAX_AGE = 24 * 60 * 60 * 1000; // Stripe expires sessions after a day
  var RETRY_MS = 5000;
  var events = [];
  var enabled = false;

  function readPending() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writePending(list) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function remember(id) {
    var list = readPending().filter(function (p) { return p.id !== id; });
    list.push({ id: id, t: Date.now() });
    writePending(list);
  }

  function forget(id) {
    writePending(readPending().filter(function (p) { return p.id !== id; }));
  }

  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || r.statusText);
        return data;
      });
    });
  }

  // Claim every remembered checkout. Paid ones grant gold once; open ones are
  // asked about again shortly; anything finished or stale is dropped.
  var claiming = false;
  function claimAll() {
    if (claiming) return;
    var list = readPending();
    if (!list.length) return;
    claiming = true;
    var retry = false;
    Promise.all(list.map(function (p) {
      if (Date.now() - p.t > PENDING_MAX_AGE) {
        forget(p.id);
        return null;
      }
      return post("/api/claim", { session: p.id }).then(function (r) {
        if (r.status === "granted") events.push({ gold: r.gold });
        if (r.status === "pending") retry = true;
        else forget(p.id);
      }, function () {
        retry = true;
      });
    })).then(function () {
      claiming = false;
      if (retry) setTimeout(claimAll, RETRY_MS);
    });
  }

  // Formatted the way the currency's home market writes it ("$4.99"): the
  // locale-aware "US$4.99" crowds the cards and says nothing Stripe won't.
  function format(amount) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: PACKS.currency.toUpperCase(),
      }).format(amount / 100);
    } catch (e) {
      return (amount / 100).toFixed(2) + " " + PACKS.currency.toUpperCase();
    }
  }

  function pack(id) {
    if (!PACKS) return null;
    for (var i = 0; i < PACKS.packs.length; i++) if (PACKS.packs[i].id === id) return PACKS.packs[i];
    return null;
  }

  // Stripe's embedded Checkout, mounted in a popup over the game so the
  // player never leaves it. Card details go straight into Stripe's own frame.
  var STRIPE_JS = "https://js.stripe.com/v3/";
  var stripeLoad = null;
  function loadStripe() {
    if (!stripeLoad) {
      stripeLoad = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = STRIPE_JS;
        script.onload = function () {
          if (window.Stripe) resolve(window.Stripe);
          else reject(new Error("Stripe.js missing"));
        };
        script.onerror = function () {
          stripeLoad = null;
          reject(new Error("Stripe.js failed to load"));
        };
        document.head.appendChild(script);
      });
    }
    return stripeLoad;
  }

  var STYLE = [
    "#oor-pay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;",
    "background:rgba(10,12,20,.72);padding:12px;box-sizing:border-box}",
    "#oor-pay .oor-panel{position:relative;width:100%;max-width:480px;max-height:100%;overflow:auto;",
    "background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45);-webkit-overflow-scrolling:touch}",
    "#oor-pay .oor-bar{position:sticky;top:0;z-index:1;display:flex;justify-content:flex-end;",
    "background:#fff;border-radius:14px 14px 0 0}",
    "#oor-pay .oor-close{width:44px;height:44px;border:0;background:none;font:28px/44px sans-serif;",
    "color:#555;cursor:pointer}",
    "#oor-pay .oor-wait{padding:48px 24px 64px;text-align:center;font:16px sans-serif;color:#666}",
    "#oor-pay .oor-form{padding:0 0 8px}",
  ].join("");

  var checkout = null; // { id, popup, embedded, done }

  function closePopup() {
    if (!checkout) return;
    var current = checkout;
    checkout = null;
    current.done = true;
    if (current.embedded) current.embedded.destroy();
    current.popup.remove();
    document.removeEventListener("keydown", onKey);
    var canvas = document.getElementById("canvas");
    if (canvas) canvas.focus();
    return current;
  }

  function onKey(e) {
    if (e.key === "Escape") cancelCheckout();
  }

  // Closed without paying: settle the session once instead of polling an
  // abandoned checkout. A payment that slipped in at the last moment still
  // grants its gold.
  function cancelCheckout() {
    var current = closePopup();
    if (!current) return;
    events.push({ closed: true });
    if (!current.id) return;
    post("/api/claim", { session: current.id }).then(function (r) {
      if (r.status === "granted") events.push({ gold: r.gold });
      forget(current.id);
    }, function () {
      forget(current.id);
    });
  }

  function failCheckout() {
    closePopup();
    events.push({ error: true });
  }

  function openCheckout(id) {
    if (checkout) return;
    if (!document.getElementById("oor-pay-style")) {
      var style = document.createElement("style");
      style.id = "oor-pay-style";
      style.textContent = STYLE;
      document.head.appendChild(style);
    }
    var popup = document.createElement("div");
    popup.id = "oor-pay";
    popup.innerHTML =
      '<div class="oor-panel" role="dialog" aria-modal="true" aria-label="Payment">' +
      '<div class="oor-bar"><button class="oor-close" type="button" aria-label="Close">&times;</button></div>' +
      '<div class="oor-wait">Loading secure payment\u2026</div>' +
      '<div class="oor-form"></div></div>';
    document.body.appendChild(popup);
    popup.querySelector(".oor-close").addEventListener("click", cancelCheckout);
    document.addEventListener("keydown", onKey);
    var current = { id: null, popup: popup, embedded: null, done: false };
    checkout = current;
    events.push({ shown: true });

    Promise.all([post("/api/checkout", { pack: id }), loadStripe()]).then(function (results) {
      var session = results[0];
      current.id = session.id;
      remember(session.id);
      if (current.done) return forget(session.id); // closed while it was being made
      var stripe = window.Stripe(session.publishableKey);
      return stripe.initEmbeddedCheckout({
        fetchClientSecret: function () {
          return Promise.resolve(session.clientSecret);
        },
        onComplete: function () {
          closePopup();
          claimAll();
        },
      }).then(function (embedded) {
        if (current.done) return embedded.destroy();
        current.embedded = embedded;
        popup.querySelector(".oor-wait").remove();
        embedded.mount(popup.querySelector(".oor-form"));
      });
    }).catch(function (err) {
      console.error(err);
      if (!current.done) failCheckout();
    });
  }

  window.OOR_STORE = {
    price: function (id) {
      var p = pack(id);
      return p && enabled ? format(p.amount) : "";
    },

    buy: function (id) {
      openCheckout(id);
      return "";
    },

    take: function () {
      return events.length ? JSON.stringify(events.shift()) : "";
    },
  };

  // Back from Stripe: remember the session in case it wasn't (another tab, a
  // cleared store), then tidy the address bar before the game starts.
  var params = new URLSearchParams(window.location.search);
  if (params.get("session_id")) remember(params.get("session_id"));
  if (params.has("checkout")) {
    history.replaceState(null, "", window.location.pathname + window.location.hash);
  }
  claimAll();

  fetch("/api/status").then(function (r) {
    return r.json();
  }).then(function (data) {
    enabled = Boolean(data.enabled);
    if (!enabled) return;
    events.push({ products: true });
    loadStripe().catch(function () {}); // ready before the first Buy
  }, function () {});
})();
