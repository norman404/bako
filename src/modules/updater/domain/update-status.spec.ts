import { describe, expect, it } from "vitest";

import {
  type UpdateDownloadProgress,
  UpdateStatus,
  calculateProgressPercentage,
  createIdleStatus,
  createCheckingStatus,
  createAvailableStatus,
  createDownloadingStatus,
  createReadyToInstallStatus,
  createErrorStatus,
} from "./update-status";

describe("calculateProgressPercentage", () => {
  it("returns 0 when contentLength is 0", () => {
    const progress: UpdateDownloadProgress = { downloaded: 0, contentLength: 0 };
    expect(calculateProgressPercentage(progress)).toBe(0);
  });

  it("returns 0 when nothing has been downloaded", () => {
    const progress: UpdateDownloadProgress = { downloaded: 0, contentLength: 1000 };
    expect(calculateProgressPercentage(progress)).toBe(0);
  });

  it("calculates 50% for half downloaded", () => {
    const progress: UpdateDownloadProgress = { downloaded: 500, contentLength: 1000 };
    expect(calculateProgressPercentage(progress)).toBe(50);
  });

  it("caps at 100% when downloaded exceeds contentLength", () => {
    const progress: UpdateDownloadProgress = { downloaded: 1200, contentLength: 1000 };
    expect(calculateProgressPercentage(progress)).toBe(100);
  });
});

describe("status factories", () => {
  it("createIdleStatus returns idle status", () => {
    const status = createIdleStatus();
    expect(status.kind).toBe(UpdateStatus.Idle);
  });

  it("createCheckingStatus returns checking status", () => {
    const status = createCheckingStatus();
    expect(status.kind).toBe(UpdateStatus.Checking);
  });

  it("createAvailableStatus stores version and notes", () => {
    const status = createAvailableStatus({ version: "2026.6.2", notes: "Bug fixes" });
    expect(status.kind).toBe(UpdateStatus.Available);
    if (status.kind === UpdateStatus.Available) {
      expect(status.version).toBe("2026.6.2");
      expect(status.notes).toBe("Bug fixes");
    }
  });

  it("createDownloadingStatus stores progress", () => {
    const status = createDownloadingStatus({ downloaded: 250, contentLength: 1000 });
    expect(status.kind).toBe(UpdateStatus.Downloading);
    if (status.kind === UpdateStatus.Downloading) {
      expect(status.progress.percentage).toBe(25);
    }
  });

  it("createReadyToInstallStatus stores version", () => {
    const status = createReadyToInstallStatus("2026.6.2");
    expect(status.kind).toBe(UpdateStatus.ReadyToInstall);
    if (status.kind === UpdateStatus.ReadyToInstall) {
      expect(status.version).toBe("2026.6.2");
    }
  });

  it("createErrorStatus stores message", () => {
    const status = createErrorStatus("Network error");
    expect(status.kind).toBe(UpdateStatus.Error);
    if (status.kind === UpdateStatus.Error) {
      expect(status.message).toBe("Network error");
    }
  });
});
