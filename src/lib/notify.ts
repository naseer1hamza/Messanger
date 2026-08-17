/**
 * Sends a native OS notification only when:
 *  - Running inside the Tauri desktop app
 *  - The app window is not currently focused (minimized or in background)
 *
 * Falls back silently in the browser (no-op).
 */

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Call once at login to ensure the user has granted notification permission. */
export async function requestNotificationPermission(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    const granted = await isPermissionGranted();
    if (!granted) {
      await requestPermission();
    }
  } catch {
    // non-critical
  }
}

/**
 * Checks whether the app window is currently focused/visible.
 *
 * On Windows, Tauri/WebView2 has a known quirk where switching focus away
 * and back (e.g. Alt-Tab, clicking another app and back) can leave OS focus
 * on the WebView2 child surface without the top-level window ever receiving
 * a focus event — causing `Window.isFocused()` to incorrectly report
 * `false` even though the user is actively looking at the window. To avoid
 * spamming notifications in that situation, treat the window as focused if
 * *any* signal says it is.
 */
async function isWindowFocused(): Promise<boolean> {
  if (document.hasFocus()) return true;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return await getCurrentWindow().isFocused();
  } catch {
    return false;
  }
}

export async function notifyNewMessage(
  senderName: string,
  body: string,
): Promise<void> {
  if (!isTauri()) return;
  if (await isWindowFocused()) return;

  try {
    const { isPermissionGranted, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );

    const granted = await isPermissionGranted();
    if (granted) {
      sendNotification({
        title: `LinkAura — ${senderName}`,
        body,
      });
    }
  } catch {
    // Silently ignore — notification is non-critical
  }
}
