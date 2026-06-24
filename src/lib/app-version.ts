import tauriConfig from "../../src-tauri/tauri.conf.json";

/**
 * Current application version, sourced from `src-tauri/tauri.conf.json`.
 * Stays in sync automatically — no manual updates needed.
 */
export const APP_VERSION = tauriConfig.version as string;
