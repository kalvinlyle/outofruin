// Runtime asset-map shim — the ONLY code from this kit that ships inside a game
// bundle. Framework-agnostic (no three.js import); a few hundred bytes.
//
// The playable build (build.js) injects `window.__PLAYABLE_ASSETS__`, a map of
// runtime asset path → data: URI, before the game bundle executes. Game code
// resolves every asset through these helpers; when the map is absent (the
// normal web/Android build) everything falls through to the network path
// untouched — zero behavior change outside the ad.

/** The embedded asset map, or null outside a playable bundle. */
export function playableAssets() {
  return (typeof window !== 'undefined' && window.__PLAYABLE_ASSETS__) || null;
}

/** True when running inside a playable-ad bundle. */
export function isPlayableBundle() {
  return !!playableAssets();
}

/**
 * Resolve one asset path against the embedded map: exact key first, then
 * suffix match (loaders often absolutize paths — `/pets/animal-cat.glb` may
 * arrive as `file:///pets/animal-cat.glb` or `https://host/pets/...`).
 * Falls through to the input untouched when unmapped or outside a playable.
 */
export function assetUrl(requested) {
  const map = playableAssets();
  if (!map) return requested;
  if (map[requested]) return map[requested];
  const key = Object.keys(map).find((k) => requested.endsWith(k));
  return key ? map[key] : requested;
}

/**
 * URL-modifier for three.js: `manager.setURLModifier(urlModifier())` — or pass
 * a `THREE.LoadingManager` and it is wired + returned, so call sites stay one
 * line: `new GLTFLoader(withPlayableAssets(new THREE.LoadingManager()))`.
 * Covers every request THREE makes through that manager (the model file AND
 * any external textures the GLTF references).
 */
export function urlModifier() {
  return (requested) => assetUrl(requested);
}

export function withPlayableAssets(manager) {
  if (isPlayableBundle()) manager.setURLModifier(urlModifier());
  return manager;
}
