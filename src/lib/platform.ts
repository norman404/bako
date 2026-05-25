/**
 * Platform detection for Tauri (WebView reflects the host OS).
 * navigator.platform is deprecated in browsers but reliable in Tauri's WebView.
 */
export const IS_MAC = /Mac/i.test(navigator.platform);
