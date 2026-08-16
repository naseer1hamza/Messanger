/**
 * Sends a native OS notification only when:
 *  - Running inside the Tauri desktop app
 *  - The app window is not currently focused (minimized or in background)
 *
 * Falls back silently in the browser (no-op).
 */

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function notifyNewMessage(
  senderName: string,
  body: string,
): Promise<void> {
  if (!isTauri()) return;
  if (document.hasFocus()) return;

  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import("@tauri-apps/plugin-notification");

    let granted = await isPermissionGranted();

    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }

    if (granted) {
      sendNotification({
        title: `Messenger — ${senderName}`,
        body,
        icon: "icons/icon.ico",
      });
    }
  } catch {
    // Silently ignore — notification is non-critical
  }
}
