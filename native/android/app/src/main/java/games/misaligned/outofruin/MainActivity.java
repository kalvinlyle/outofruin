// Copy over the four-line stub `npx cap add android` writes, at
// android/app/src/main/java/<appId as directories>/MainActivity.java.
// Change ONLY the package line.
package games.misaligned.outofruin;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * The game owns the whole screen.
 *
 * A portrait game is a picture, and the status bar and gesture bar crop a band
 * off the top and bottom of it — on a tall phone a tenth of the frame, usually
 * straight over the game's own HUD and its own bottom row. The web build has no
 * bars, so without this the store build looks like a worse version of the same
 * code.
 *
 * This sits ALONGSIDE the SystemBars block in capacitor.config.json, and the
 * pair is not redundant. Four separate things have to be true, and missing any
 * one of them produces a different visible fault:
 *
 *  1. setDecorFitsSystemWindows(false) — the LAYOUT half. Without it the bars
 *     hide but the page keeps the gap they left: the same crop, with nothing
 *     drawn in it.
 *  2. hide(systemBars()) — the bars themselves.
 *  3. BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE — the part Capacitor's plugin never
 *     sets. Its setHidden() calls hide() and stops, so Android applies
 *     BEHAVIOR_DEFAULT and ANY TOUCH brings the bars back. On a game driven
 *     entirely by swiping that means they return on the first input and stay.
 *     Under this behaviour a deliberate edge swipe floats them back
 *     temporarily and they auto-hide again, so Home and the clock stay
 *     reachable — which matters here because both edges are live surfaces: the
 *     HUD is against the top and the nav bar against the bottom.
 *  4. Re-applying on focus — see onWindowFocusChanged.
 *
 * And the config's insetsHandling "disable" stops Capacitor padding the
 * WebView's parent by the system-bar insets, which otherwise shows as black
 * bands across the top and bottom once the bars themselves are gone.
 *
 * targetSdk is 36, so the app is edge-to-edge whether it asks to be or not and
 * the legacy routes are dead: FLAG_FULLSCREEN and SYSTEM_UI_FLAG_IMMERSIVE_STICKY
 * are deprecated no-ops on this target. WindowInsetsController is the supported
 * replacement.
 *
 * All of this is NATIVE and reaches players only through a Play release. There
 * is no over-the-air version of it. Trying to do the re-apply from JavaScript
 * instead — hiding the bars again on every touch — makes the app UNUSABLE: each
 * touch shows them, the script hides them, Capacitor's CSS safe-area insets
 * move twice per tap, and the buttons walk out from under the player's finger.
 * drilldown shipped that in an OTA bundle and had to roll it back.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyFullscreen();
    }

    /**
     * The bars come back on their own after events the app does not control —
     * returning from the recents switcher, a permission dialog, the
     * notification shade being pulled down. Re-applying whenever the window
     * regains focus is what makes fullscreen stick rather than survive only
     * until the first interruption.
     */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyFullscreen();
        }
    }

    private void applyFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
