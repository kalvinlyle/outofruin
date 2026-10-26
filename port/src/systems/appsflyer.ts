// AppsFlyer install attribution (MMP) — drop into src/systems/appsflyer.ts.
// Runs ONLY in the Capacitor native app (the plugin has no web implementation).
// Production builds fail before shipping when the key is absent; af_boot makes
// the runtime state visible instead of silently losing attribution.
// Wire in main.ts with a dynamic import so the web bundle never pulls it in:
//   void import("./systems/appsflyer").then((m) => m.initAppsFlyer());
//
// It also carries attribution ACROSS into PostHog, which is the only reason the
// two systems can answer one question ("did the campaign buy players who stay?"
// rather than "how many installs?" and "how many D1s?" side by side):
//   - install af_status / media_source / campaign → super props + person
//     (stamped ONCE per install, from whatever the conversion callback last
//     delivered — cached payloads included; see stampAttribution)
//   - PostHog's distinct_id → AppsFlyer CUID, so raw exports join to persons
//
// It therefore DEPENDS on analytics.ts, as a sibling module (`./analytics`): the
// CUID has to be the post-identify device id, which is asynchronous, so calling
// initAppsFlyer() after initAnalytics() returns is not on its own enough. See
// whenAnalyticsIdentified() at the setCustomerUserId call below. If you put
// these two files anywhere other than side by side, fix this import.
import { Capacitor } from "@capacitor/core";
import posthog from "posthog-js";

import { whenAnalyticsIdentified } from "./analytics";

// LITERAL `import.meta.env.VITE_X` member access, one key per site — that exact
// form is the only one Vite guarantees to inline at build time. Reading these
// through an intermediate object (`const env = (import.meta as {...}).env`, the
// shape this template used to carry) compiles to an EMPTY object in a
// production bundle: both keys read `undefined` at runtime, so the SDK never
// started, conversion data never fired and attribution never reached PostHog.
// That shipped — AppsFlyer was never initialized in Infinite Kitchen's store
// builds (IK d798876). See "Env reads" in SKILL.md step 3.
const DEV_KEY = import.meta.env.VITE_APPSFLYER_DEV_KEY;
// Analytics keeps the same no-key-no-op contract, so without this key posthog
// was never init'd and the stamping below has nowhere to land.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const DEV = import.meta.env.DEV === true;

// Install attribution is a property of the install, not of the session: stamp
// it once and never again, or a later relaunch's (empty) payload overwrites it.
// With the is_first_launch gate gone (see stampAttribution) this flag and
// $set_once ARE the first-touch enforcement — keep both.
const STAMPED = "af_attribution_stamped";

let ready = false;

function ping(event: string, props: Record<string, unknown>): void {
  try {
    if (POSTHOG_KEY) posthog.capture(event, props);
  } catch {
    /* diagnostics must never break the game */
  }
}

/** Start AppsFlyer once, early in boot. Native-only; browser / fake-door skip. */
export async function initAppsFlyer(): Promise<void> {
  if (ready) return;
  if (!Capacitor.isNativePlatform()) return;
  // Always report runtime wiring before the key guard. This distinguishes a
  // missing key from a callback that never fired or a payload that lacked data.
  ping("af_boot", {
    af_has_key: Boolean(DEV_KEY),
    af_has_posthog: Boolean(POSTHOG_KEY),
  });
  if (!DEV_KEY) {
    if (DEV) console.info("[appsflyer] no VITE_APPSFLYER_DEV_KEY — attribution disabled");
    return;
  }
  try {
    // Lazy import so the web bundle never pulls in the native plugin.
    const { AppsFlyer, AFConstants } = await import("appsflyer-capacitor-plugin");

    // Subscribe BEFORE initSDK. initSDK also STARTS the session (manualStart is
    // off), and the plugin's notifyListeners is fire-and-forget — a listener
    // added after the server answers hears nothing.
    AppsFlyer.addListener(AFConstants.CONVERSION_CALLBACK, (event) => {
      // Breadcrumb, one low-volume event per launch. It exists to make this
      // whole failure class VISIBLE: installs were reaching AppsFlyer daily
      // while no af_status had ever landed on a PostHog person, every file read
      // correctly, and nothing on the wire said which hop dropped it — the
      // callback firing at all, the payload being empty, is_first_launch being
      // false, af_status being absent, and stampAttribution bailing are five
      // different bugs that look identical from the outside. Remove it once the
      // stamp rate is proven (af_status present on the persons you expect).
      try {
        const d = (event.data ?? {}) as Record<string, unknown>;
        ping("af_conversion_event", {
          af_callback_name: String(event.callbackName ?? ""),
          af_has_data: event.data != null,
          af_is_first_launch: String(d["is_first_launch"] ?? ""),
          af_has_status: typeof d["af_status"] === "string",
          af_media_source: typeof d["media_source"] === "string" ? d["media_source"] : "",
        });
      } catch {
        /* diagnostics must never break attribution */
      }
      // The same callback carries onConversionDataFail, which has no `data`.
      if (event.callbackName !== AFConstants.onConversionDataSuccess) {
        if (DEV) console.warn("[appsflyer] conversion data failed", event);
        return;
      }
      stampAttribution((event.data ?? {}) as Record<string, unknown>);
    });

    await AppsFlyer.initSDK({
      devKey: DEV_KEY,
      appID: "", // iOS App Store id — unused on Android-only apps
      isDebug: DEV,
      minTimeBetweenSessions: 6,
      registerConversionListener: true, // false ⇒ the listener above never fires
      registerOnAppOpenAttribution: false,
    });
    ready = true;

    // The join key: same id on both sides, so an AppsFlyer raw-data export
    // (installs, CTIT, media source) can be joined to a PostHog person row by
    // customer_user_id. Set after start, so it lands on this session's events
    // rather than on the install record itself — a CUID on the install would
    // need manualStart, and an app that forgets to call startSDK() reports no
    // attribution at all, which is the worse failure.
    //
    // ORDERING, load-bearing. On native, analytics.ts re-identifies the person
    // as the DEVICE (`Device.getId()`) a beat after `posthog.init()`, and that
    // hop is async — so "call initAppsFlyer() after initAnalytics()" does NOT
    // guarantee the id below is the device one. Read it too early and AppsFlyer
    // gets the anonymous boot id, which the next storage clear retires: the CUID
    // then names a person nobody will ever be again and the join quietly matches
    // nothing. Awaiting the identity is the whole fix, and it is free here —
    // this line runs after initSDK, long past first paint, inside a module that
    // was dynamically imported in the first place.
    let distinctId = "";
    if (POSTHOG_KEY) {
      await whenAnalyticsIdentified(); // bounded; falls through if it never lands
      distinctId = posthog.get_distinct_id();
    }
    if (distinctId) await AppsFlyer.setCustomerUserId({ cuid: distinctId });
  } catch (err) {
    if (DEV) console.warn("[appsflyer] init failed", err);
  }
}

/**
 * Carry install attribution into PostHog.
 *
 * The timing is the whole reason this is shaped like this: conversion data
 * arrives ASYNC, a beat after first launch, by which time PostHog has already
 * sent `$pageview` (and probably the game's session-start). So it can never be
 * a property of the first event. Instead it goes on
 *   - super properties, which persist and ride every LATER event, and
 *   - the person, set-once, which is retroactive for the whole person and
 *     survives the app being reinstalled onto the same profile.
 * `person_profiles: "always"` in analytics.ts is what makes the person half work
 * at all — don't switch it back. Native players ARE identified now (the device
 * id), but not until a beat after boot, and web players never are, so under
 * `identified_only` PostHog would still drop these properties from every event
 * captured in the meantime.
 *
 * Every field is optional (an organic install typically has af_status and
 * nothing else).
 */
function stampAttribution(data: Record<string, unknown>): void {
  try {
    if (!POSTHOG_KEY) return;
    // NO is_first_launch GATE — deliberately, and don't put one back. It reads
    // like the obviously correct guard and it was a silent data loss: installs
    // reached AppsFlyer daily while ZERO af_status ever landed on a PostHog
    // person. Dropping it is safe because the conversion callback re-delivers
    // CACHED conversion data on EVERY launch, and first touch is already
    // enforced twice over — by the STAMPED once-guard below and by
    // setPersonProperties' $set_once semantics. So the strict gate bought
    // nothing the once-guard wasn't already buying, while costing every player
    // whose first launch didn't deliver a usable payload; stamping from cached
    // data instead heals them on their next launch rather than losing them for
    // good. (is_first_launch is still READ — it rides the af_conversion_event
    // breadcrumb above and the DEV log below, as diagnostics.)
    if (localStorage.getItem(STAMPED)) return;

    const props: Record<string, string> = {};
    const put = (key: string, value: unknown) => {
      if (typeof value === "string" && value) props[key] = value;
    };
    put("af_status", data["af_status"]); // 'Organic' | 'Non-organic'
    put("af_media_source", data["media_source"]);
    put("af_campaign", data["campaign"]);
    if (!Object.keys(props).length) return;

    posthog.register(props); // every event from here on
    posthog.setPersonProperties(undefined, props); // $set_once — first touch wins
    localStorage.setItem(STAMPED, "1");
    if (DEV) console.info("[appsflyer] attribution stamped", props, {
      is_first_launch: data["is_first_launch"],
    });
  } catch {
    /* attribution must never break the game (same rule as analytics) */
  }
}
