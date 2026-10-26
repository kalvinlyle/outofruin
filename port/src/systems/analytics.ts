// Product analytics: PostHog (EU cloud, read by FOUNDRY) and Snowplow (Supercell's
// pipeline), both fed from the one track() below so the two never drift apart.
// The game's own events come from controllers/gaController.ts, which the shipped
// game already pointed at Google Analytics for every screen, quest, chapter and
// purchase; see docs/analytics.md for the event list and the PostHog/Snowplow mapping.
//
// The contract (mobile-launch skill, references/analytics.ts):
//   - no key: every call is a safe no-op
//   - autocapture off, pageview/pageleave on, session replay never started
//   - person profiles always, so install attribution stamped on the person sticks
//   - on native the person IS the device (identify with Device.getId()); web stays anonymous
//   - native_platform / app_platform / is_native_app / game_version registered on every event
//   - telemetry never throws into gameplay
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import posthog from 'posthog-js';
import { newTracker, trackSelfDescribingEvent, type SelfDescribingJson } from '@snowplow/browser-tracker';

type Props = Record<string, unknown>;

// Literal member access, one key per site: port/package.json maps each to window.OOR_ENV.
const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
// The web bundle's version (game/ota-version.json), so web, app and every OTA
// bundle of one release report the same string.
const GAME_VERSION = import.meta.env.VITE_GAME_VERSION || 'unversioned';
// Snowplow stays off until the game has its app_id from #ai-analytics and legal
// consent from #new-games-support; both are on the launch checklist.
const SNOWPLOW_APP_ID = import.meta.env.VITE_SNOWPLOW_APP_ID;
const SNOWPLOW_COLLECTOR = import.meta.env.VITE_SNOWPLOW_COLLECTOR || 'https://com-supercell-qa1.collector.snplow.net';

let ready = false;

let resolveIdentified: () => void = () => {};
const identified = new Promise<void>((resolve) => { resolveIdentified = resolve; });
const IDENTITY_WAIT_MS = 3000;

/** Bring analytics up once, early in boot. */
export function initAnalytics(): void {
  if (ready) return;
  startSnowplow();
  if (!KEY) {
    resolveIdentified();
    return;
  }
  try {
    posthog.init(KEY, {
      // EU, always: the org has no project in the US cloud.
      api_host: HOST,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      // identify() runs on native only, a beat after boot; under identified_only
      // PostHog would drop the attribution person properties from every event before it.
      person_profiles: 'always',
      persistence: 'localStorage',
    });
    // FOUNDRY splits store-app traffic from browser traffic on these and nothing
    // else (the WebView's user agent is ordinary mobile Chrome), and super
    // properties attach at capture time, so an untagged event stays untagged.
    const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
    posthog.register({
      native_platform: platform,
      app_platform: platform === 'android' || platform === 'ios' ? platform : 'web',
      is_native_app: Capacitor.isNativePlatform(),
      game_version: GAME_VERSION,
    });
    ready = true;
    if (Capacitor.isNativePlatform()) void identifyDevice();
    else resolveIdentified();
  } catch (err) {
    console.warn('[analytics] init failed:', err);
    resolveIdentified();
  }
}

/**
 * One person per device on native: PostHog's default id lives in localStorage,
 * which storage cleaners wipe on low-end Android, minting a phantom new player
 * out of a phone the game already had. ANDROID_ID survives a data clear and a
 * reinstall. Web is never identified.
 */
async function identifyDevice(): Promise<void> {
  try {
    const { identifier } = await Device.getId();
    if (identifier) {
      posthog.identify(identifier);
      deviceId = identifier;
    }
  } catch {
    /* an anonymous person, as before */
  } finally {
    resolveIdentified();
  }
}

/** Resolves once the device identity has landed (or won't); bounded so nothing wedges. appsflyer.ts awaits it. */
export function whenAnalyticsIdentified(): Promise<void> {
  return Promise.race([identified, new Promise<void>((r) => { setTimeout(r, IDENTITY_WAIT_MS); })]);
}

/** Record a product event in PostHog, and its Snowplow counterpart. Safe before init or without keys. */
export function track(event: string, props?: Props): void {
  if (ready) {
    try { posthog.capture(event, props); } catch { /* swallow */ }
  }
  try { snowplowFor(event, props ?? {}); } catch { /* swallow */ }
}

// ---------------------------------------------------------------- Snowplow

const IGLU = 'iglu:com.supercell.analytics';
let snowplow = false;
let sessionId = '';
let sessionStart = 0;
let deviceId = '';
let lastScreen = '';
const counters = new Map<string, number>();

function uuid(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}

function accountId(): string {
  // The PostHog person once identified (the device id on native), else a stable local id.
  if (deviceId) return deviceId;
  try {
    let id = localStorage.getItem('oor.analytics.account');
    if (!id) { id = uuid(); localStorage.setItem('oor.analytics.account', id); }
    return id;
  } catch {
    return 'unknown';
  }
}

function context(): SelfDescribingJson {
  const platform = Capacitor.getPlatform();
  const lang = (typeof navigator !== 'undefined' && navigator.language) || '';
  return {
    schema: `${IGLU}/telemetry_context/jsonschema/1-0-0`,
    data: {
      app_id: SNOWPLOW_APP_ID,
      account_id: accountId(),
      session_id: sessionId || 'none',
      ...(lang ? { language: lang.slice(0, 8) } : {}),
      platform: platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web',
      app_version: GAME_VERSION,
      ...(deviceId ? { device_id: deviceId } : {}),
      client_timestamp: new Date().toISOString(),
    },
  };
}

function send(event: string, data: Record<string, unknown>) {
  if (!snowplow) return;
  trackSelfDescribingEvent({ event: { schema: `${IGLU}/${event}/jsonschema/1-0-0`, data }, context: [context()] });
}

function startSnowplow() {
  if (!SNOWPLOW_APP_ID) return;
  try {
    newTracker('oor', SNOWPLOW_COLLECTOR, {
      appId: SNOWPLOW_APP_ID,
      platform: Capacitor.isNativePlatform() ? 'mob' : 'web',
      encodeBase64: false,
      eventMethod: 'post',
      bufferSize: 1,
      stateStorageStrategy: 'localStorage',
      contexts: { webPage: false },
    });
    snowplow = true;
    beginSession();
    // A session ends when the player leaves the app; returning starts a new one.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') endSession('backgrounded');
      else if (!sessionId) beginSession();
    });
  } catch (err) {
    console.warn('[analytics] snowplow init failed:', err);
  }
}

function beginSession() {
  sessionId = uuid();
  sessionStart = Date.now();
  counters.clear();
  send('session_started', {});
}

function endSession(reason: string) {
  if (!sessionId) return;
  send('session_ended', { reason, duration_ms: Date.now() - sessionStart, ...(lastScreen ? { last_screen: lastScreen } : {}) });
  send('session_statistics', { counters: [...counters].map(([counter_name, counter_value]) => ({ counter_name, counter_value })) });
  sessionId = '';
}

const count = (name: string) => counters.set(name, (counters.get(name) ?? 0) + 1);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** The Snowplow event for a PostHog one: docs/analytics.md has the table. Only schema fields go out. */
function snowplowFor(event: string, p: Props) {
  if (!snowplow) return;
  switch (event) {
    case 'screen_viewed':
      lastScreen = String(p.screen ?? '');
      count('screens_viewed');
      send('player_action', { action: 'ui.screen.open', action_category: 'ui', params: { screen: lastScreen } });
      return;
    case 'chapter_completed':
      count('chapters_completed');
      if (num(p.chapter) !== undefined) {
        send('level_changed', { level_type: 'chapter', previous_level_value: (p.chapter as number), new_level_value: (p.chapter as number) + 1, reason: 'chapter_completed' });
      }
      return;
    case 'quest_completed':
      count('quests_completed');
      send('completion_status', { type: 'quest', level: String(p.quest ?? 'unknown'), status: 'success' });
      return;
    case 'ftue_completed':
      send('completion_status', { type: 'tutorial', level: 'ftue', status: 'success' });
      return;
    case 'gold_purchased':
      count('gold_purchases');
      send('resource_changed', {
        resource_id: 'gold',
        ...(num(p.gold_before) !== undefined ? { before: p.gold_before } : {}),
        ...(num(p.gold_after) !== undefined ? { after: p.gold_after } : {}),
        change_reason: 'iap_purchase',
        ...(p.transaction_id ? { transaction_id: String(p.transaction_id) } : {}),
      });
      return;
    default:
      send('player_action', { action: `game.${event}`.slice(0, 128), action_category: 'game', params: scalars(p) });
  }
}

function scalars(p: Props): Record<string, string | number | boolean | null> | null {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v as any;
  }
  return Object.keys(out).length ? out : null;
}

// ---------------------------------------------------------------- the game's events

const FTUE_KEY = 'oor.analytics.ftue';

/**
 * FOUNDRY's D0 activation input, fired exactly once per install.
 */
export function ftueCompleted(): void {
  try {
    if (localStorage.getItem(FTUE_KEY)) return;
    localStorage.setItem(FTUE_KEY, '1');
  } catch {
    return;
  }
  track('ftue_completed');
}

/**
 * The shipped game's Google Analytics calls (controllers/gaController.ts), turned
 * into named events. One call site for every gameplay event the game reports.
 */
export function gameEvent(category: string, action: string, label: string, value: number): void {
  const n = (s: string) => Number(String(s).replace(/\D+/g, ''));
  switch (category) {
    case 'Screen View':
      track('screen_viewed', { screen: action });
      return;
    case 'Game':
      track(action === 'Start' ? 'game_started' : 'returned_to_game');
      return;
    case 'Chapter Completed': {
      const chapter = n(action);
      track('chapter_completed', { chapter });
      if (chapter === FTUE_CHAPTER) ftueCompleted();
      return;
    }
    case 'Quest Completed':
      track('quest_completed', { quest: action.replace(/^Quest /, '') });
      return;
    case 'Gold Earned':
      track('chapter_gold_earned', { chapter: n(action), gold: value });
      return;
    case 'Shop':
      track('shop_bought', { item: action, amount: value });
      return;
    case 'Reset Progress':
      track('progress_reset');
      return;
    default:
      track('game_event', { category, action, label, value });
  }
}

/** The chapter whose completion counts as the end of the first-time experience. */
export const FTUE_CHAPTER = 1;

/**
 * Open the data deletion page (game/store/delete.html) in the browser, with this
 * device's identifier in the URL fragment, which never reaches a server. Native only.
 */
export async function openDeleteDataPage(origin: string): Promise<void> {
  let id = deviceId;
  try { if (!id) id = (await Device.getId()).identifier; } catch { /* the page asks for it instead */ }
  const url = `${origin}/store/delete.html${id ? `#id=${encodeURIComponent(id)}` : ''}`;
  window.open(url, '_blank');
}
