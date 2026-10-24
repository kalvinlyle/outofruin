// The game's side of real-money purchases. Lua talks to it through
// html5.run: OOR_STORE.price(id) for card labels, OOR_STORE.buy(id) to start
// a Stripe Checkout, and OOR_STORE.take() each tick for anything to act on
// ({"gold": n} to grant, {"error": true} to report, {"products": true} when
// prices became available and the shop should relabel).
(function () {
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

  window.OOR_STORE = {
    price: function (id) {
      var p = pack(id);
      return p && enabled ? format(p.amount) : "";
    },

    buy: function (id) {
      post("/api/checkout", { pack: id }).then(function (r) {
        remember(r.id);
        // Stripe Checkout refuses to load in a frame, so leave the whole page.
        try {
          window.top.location.href = r.url;
        } catch (e) {
          window.location.href = r.url;
        }
      }, function () {
        events.push({ error: true });
      });
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
    if (enabled) events.push({ products: true });
  }, function () {});
})();
