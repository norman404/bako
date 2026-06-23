import { check, type Update, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Internal handle used by the updater module. It deliberately hides the Tauri
 * Update class so tests don't need to construct it or know its private shape.
 */
export interface UpdateHandle {
  version: string;
  notes: string;
  downloadAndInstall(onEvent: (event: DownloadEvent) => void): Promise<void>;
}

export interface UpdateAvailableInfo {
  version: string;
  notes: string;
  handle: UpdateHandle;
}

export interface CheckForUpdateDependencies {
  check: () => Promise<Update | null>;
}

export interface RelaunchDependencies {
  relaunch: () => Promise<void>;
}

export async function checkForUpdate(
  deps: CheckForUpdateDependencies = { check },
): Promise<UpdateAvailableInfo | null> {
  const update = await deps.check();

  if (!update) {
    return null;
  }

  return {
    version: update.version,
    notes: update.body ?? "",
    handle: {
      version: update.version,
      notes: update.body ?? "",
      downloadAndInstall: (onEvent) => update.downloadAndInstall(onEvent),
    },
  };
}

export async function downloadAndInstallUpdate(
  handle: UpdateHandle,
  onEvent: (event: DownloadEvent) => void,
): Promise<void> {
  await handle.downloadAndInstall(onEvent);
}

export async function relaunchApplication(
  deps: RelaunchDependencies = { relaunch },
): Promise<void> {
  await deps.relaunch();
}
