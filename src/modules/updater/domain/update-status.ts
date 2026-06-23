export enum UpdateStatus {
  Idle = "idle",
  Checking = "checking",
  Available = "available",
  Downloading = "downloading",
  ReadyToInstall = "ready-to-install",
  Error = "error",
}

export interface UpdateDownloadProgress {
  downloaded: number;
  contentLength: number;
}

export type UpdateInfo =
  | { kind: UpdateStatus.Idle }
  | { kind: UpdateStatus.Checking }
  | { kind: UpdateStatus.Available; version: string; notes: string }
  | { kind: UpdateStatus.Downloading; progress: UpdateDownloadProgress & { percentage: number } }
  | { kind: UpdateStatus.ReadyToInstall; version: string }
  | { kind: UpdateStatus.Error; message: string };

export function calculateProgressPercentage(progress: UpdateDownloadProgress): number {
  if (progress.contentLength === 0) {
    return 0;
  }
  const percentage = Math.round((progress.downloaded / progress.contentLength) * 100);
  return Math.min(percentage, 100);
}

export function createIdleStatus(): UpdateInfo {
  return { kind: UpdateStatus.Idle };
}

export function createCheckingStatus(): UpdateInfo {
  return { kind: UpdateStatus.Checking };
}

export function createAvailableStatus(input: { version: string; notes: string }): UpdateInfo {
  return { kind: UpdateStatus.Available, version: input.version, notes: input.notes };
}

export function createDownloadingStatus(progress: UpdateDownloadProgress): UpdateInfo {
  return {
    kind: UpdateStatus.Downloading,
    progress: { ...progress, percentage: calculateProgressPercentage(progress) },
  };
}

export function createReadyToInstallStatus(version: string): UpdateInfo {
  return { kind: UpdateStatus.ReadyToInstall, version };
}

export function createErrorStatus(message: string): UpdateInfo {
  return { kind: UpdateStatus.Error, message };
}
