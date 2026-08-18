import { invoke } from "@tauri-apps/api/core";

export async function openSettingsWindow(): Promise<void> {
  await invoke("open_settings_window");
}
