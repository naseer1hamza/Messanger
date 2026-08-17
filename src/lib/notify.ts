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

export async function notifyNewMessage(
  senderName: string,
  body: string,
): Promise<void> {
  if (!isTauri()) return;
  if (document.hasFocus()) return;

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
