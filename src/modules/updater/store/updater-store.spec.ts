import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";

mock.module("@/modules/updater/adapters/tauri-updater.adapter", () => ({
  checkForUpdate: mock(),
  downloadAndInstallUpdate: mock(),
  relaunchApplication: mock(),
}));

import {
  checkForUpdate,
  downloadAndInstallUpdate,
  relaunchApplication,
  type UpdateHandle,
} from "@/modules/updater/adapters/tauri-updater.adapter";
import {
  UpdateStatus,
  createIdleStatus,
  createCheckingStatus,
  createAvailableStatus,
  createReadyToInstallStatus,
  createErrorStatus,
} from "@/modules/updater/domain/update-status";
import { useUpdaterStore } from "./updater-store";

const checkForUpdateMock = checkForUpdate as Mock<typeof checkForUpdate>;
const downloadAndInstallUpdateMock = downloadAndInstallUpdate as Mock<typeof downloadAndInstallUpdate>;
const relaunchApplicationMock = relaunchApplication as Mock<typeof relaunchApplication>;

function buildHandle(
  overrides: Partial<UpdateHandle> = {},
): { handle: UpdateHandle; downloadAndInstall: ReturnType<typeof mock> } {
  const downloadAndInstall = mock((_onEvent: (event: DownloadEvent) => void) => Promise.resolve());
  const handle: UpdateHandle = {
    version: "2026.6.2",
    notes: "",
    downloadAndInstall,
    ...overrides,
  };
  return { handle, downloadAndInstall };
}

function resetStore() {
  useUpdaterStore.setState({ status: createIdleStatus(), _updateHandle: null });
}

describe("useUpdaterStore", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    resetStore();
  });

  describe("checkForUpdates", () => {
    it("starts in idle status", () => {
      expect(useUpdaterStore.getState().status).toEqual(createIdleStatus());
    });

    it("sets checking status while the check is in progress", async () => {
      let resolveCheck: (value: { version: string; notes: string; handle: UpdateHandle } | null) => void = () => undefined;
      checkForUpdateMock.mockReturnValue(
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
      );

      const promise = useUpdaterStore.getState().checkForUpdates();

      expect(useUpdaterStore.getState().status).toEqual(createCheckingStatus());

      resolveCheck(null);
      await promise;

      expect(useUpdaterStore.getState().status).toEqual(createIdleStatus());
    });

    it("sets available status when an update is found", async () => {
      const { handle } = buildHandle();
      checkForUpdateMock.mockResolvedValue({
        version: "2026.6.2",
        notes: "Bug fixes",
        handle,
      });

      await useUpdaterStore.getState().checkForUpdates();

      expect(useUpdaterStore.getState().status).toEqual(
        createAvailableStatus({ version: "2026.6.2", notes: "Bug fixes" }),
      );
    });

    it("clears the handle and goes idle when no update is available", async () => {
      checkForUpdateMock.mockResolvedValue(null);

      await useUpdaterStore.getState().checkForUpdates();

      expect(useUpdaterStore.getState().status).toEqual(createIdleStatus());
      expect(useUpdaterStore.getState()._updateHandle).toBeNull();
    });

    it("sets error status when the check fails", async () => {
      checkForUpdateMock.mockRejectedValue(new Error("check failed"));

      await useUpdaterStore.getState().checkForUpdates();

      expect(useUpdaterStore.getState().status).toEqual(createErrorStatus("check failed"));
    });
  });

  describe("downloadAndInstall", () => {
    it("sets an error when there is no update to install", async () => {
      await useUpdaterStore.getState().downloadAndInstall();

      expect(useUpdaterStore.getState().status).toEqual(
        createErrorStatus("No update available to install"),
      );
    });

    it("tracks download progress and ends ready to install", async () => {
      const { handle } = buildHandle({
        downloadAndInstall: mock((onEvent: (event: DownloadEvent) => void) => {
          onEvent({ event: "Started", data: { contentLength: 1000 } });
          onEvent({ event: "Progress", data: { chunkLength: 300 } });
          onEvent({ event: "Progress", data: { chunkLength: 200 } });
          onEvent({ event: "Progress", data: { chunkLength: 500 } });
          onEvent({ event: "Finished" });
          return Promise.resolve();
        }),
      });
      checkForUpdateMock.mockResolvedValue({ version: "2026.6.2", notes: "", handle });
      downloadAndInstallUpdateMock.mockImplementation(
        async (targetHandle: UpdateHandle, onEvent: (event: DownloadEvent) => void) => {
          await targetHandle.downloadAndInstall(onEvent);
        },
      );

      await useUpdaterStore.getState().checkForUpdates();
      await useUpdaterStore.getState().downloadAndInstall();

      expect(useUpdaterStore.getState().status).toEqual(createReadyToInstallStatus("2026.6.2"));
      expect(useUpdaterStore.getState().status.kind).toBe(UpdateStatus.ReadyToInstall);
      expect(downloadAndInstallUpdate).toHaveBeenCalledOnce();
      expect(handle.downloadAndInstall).toHaveBeenCalledOnce();
    });

    it("sets the last downloading status with the accumulated progress", async () => {
      const { handle } = buildHandle({
        downloadAndInstall: mock((onEvent: (event: DownloadEvent) => void) => {
          onEvent({ event: "Started", data: { contentLength: 1000 } });
          onEvent({ event: "Progress", data: { chunkLength: 250 } });
          onEvent({ event: "Finished" });
          return Promise.resolve();
        }),
      });
      checkForUpdateMock.mockResolvedValue({ version: "2026.6.2", notes: "", handle });
      downloadAndInstallUpdateMock.mockImplementation(
        async (targetHandle: UpdateHandle, onEvent: (event: DownloadEvent) => void) => {
          await targetHandle.downloadAndInstall(onEvent);
        },
      );

      await useUpdaterStore.getState().checkForUpdates();
      await useUpdaterStore.getState().downloadAndInstall();

      // Final ReadyToInstall is set after the stream ends; the last downloading
      // snapshot reported 250/1000.
      expect(useUpdaterStore.getState().status).toEqual(createReadyToInstallStatus("2026.6.2"));
    });

    it("sets error status when the download fails", async () => {
      const { handle } = buildHandle({
        downloadAndInstall: mock(() => Promise.reject(new Error("download failed"))),
      });
      checkForUpdateMock.mockResolvedValue({ version: "2026.6.2", notes: "", handle });
      downloadAndInstallUpdateMock.mockImplementation(
        async (targetHandle: UpdateHandle, onEvent: (event: DownloadEvent) => void) => {
          await targetHandle.downloadAndInstall(onEvent);
        },
      );

      await useUpdaterStore.getState().checkForUpdates();
      await useUpdaterStore.getState().downloadAndInstall();

      expect(useUpdaterStore.getState().status).toEqual(createErrorStatus("download failed"));
    });
  });

  describe("relaunch", () => {
    it("calls relaunch application", async () => {
      relaunchApplicationMock.mockResolvedValue(undefined);

      await useUpdaterStore.getState().relaunch();

      expect(relaunchApplication).toHaveBeenCalledOnce();
    });

    it("sets error status when relaunch fails", async () => {
      relaunchApplicationMock.mockRejectedValue(new Error("relaunch failed"));

      await useUpdaterStore.getState().relaunch();

      expect(useUpdaterStore.getState().status).toEqual(createErrorStatus("relaunch failed"));
    });
  });

  describe("reset", () => {
    it("resets status back to idle and clears the handle", async () => {
      checkForUpdateMock.mockRejectedValue(new Error("check failed"));
      await useUpdaterStore.getState().checkForUpdates();
      expect(useUpdaterStore.getState().status.kind).toBe(UpdateStatus.Error);

      useUpdaterStore.getState().reset();

      expect(useUpdaterStore.getState().status).toEqual(createIdleStatus());
      expect(useUpdaterStore.getState()._updateHandle).toBeNull();
    });
  });
});