import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";

mock.module("@/modules/updater/adapters/tauri-updater.adapter", () => ({
  checkForUpdate: mock(),
  downloadAndInstallUpdate: mock(),
  relaunchApplication: mock(),
}));

import { checkForUpdate, type UpdateHandle } from "@/modules/updater/adapters/tauri-updater.adapter";
import {
  createIdleStatus,
  createCheckingStatus,
  createAvailableStatus,
  createDownloadingStatus,
  createReadyToInstallStatus,
  createErrorStatus,
} from "@/modules/updater/domain/update-status";
import { useUpdaterStore } from "@/modules/updater/store/updater-store";

import { useUpdater } from "./use-updater";

const checkForUpdateMock = checkForUpdate as Mock<typeof checkForUpdate>;

function resetStore() {
  useUpdaterStore.setState({ status: createIdleStatus(), _updateHandle: null });
}

describe("useUpdater", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    resetStore();
  });

  it("projects the idle status with all derived flags off", () => {
    const { result } = renderHook(() => useUpdater());

    expect(result.current.status).toEqual(createIdleStatus());
    expect(result.current.isChecking).toBe(false);
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isReadyToInstall).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.each([
    { label: "checking", status: createCheckingStatus(), expected: { isChecking: true } },
    {
      label: "available",
      status: createAvailableStatus({ version: "1.2.0", notes: "" }),
      expected: { hasUpdate: true },
    },
    {
      label: "downloading",
      status: createDownloadingStatus({ downloaded: 1, contentLength: 10 }),
      expected: { isDownloading: true },
    },
    {
      label: "ready-to-install",
      status: createReadyToInstallStatus("1.2.0"),
      expected: { isReadyToInstall: true },
    },
    {
      label: "error",
      status: createErrorStatus("boom"),
      expected: { error: "boom" },
    },
  ])("derives flags from $label status", ({ status, expected }) => {
    useUpdaterStore.setState({ status, _updateHandle: null });
    const { result } = renderHook(() => useUpdater());

    for (const [key, value] of Object.entries(expected)) {
      expect(result.current[key as keyof typeof result.current]).toBe(value);
    }
  });

  it("reacts to store status changes (subscription)", async () => {
    const { result } = renderHook(() => useUpdater());
    expect(result.current.hasUpdate).toBe(false);

    act(() => {
      useUpdaterStore.setState({
        status: createAvailableStatus({ version: "1.2.0", notes: "" }),
        _updateHandle: null,
      });
    });

    await waitFor(() => expect(result.current.hasUpdate).toBe(true));
  });

  it("wires actions to the store", async () => {
    const handle: UpdateHandle = {
      version: "1.2.0",
      notes: "",
      downloadAndInstall: mock(() => Promise.resolve()),
    };
    checkForUpdateMock.mockResolvedValue({ version: "1.2.0", notes: "", handle });

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(checkForUpdate).toHaveBeenCalledOnce();
    expect(result.current.hasUpdate).toBe(true);
    expect(useUpdaterStore.getState().status).toEqual(
      createAvailableStatus({ version: "1.2.0", notes: "" }),
    );
  });
});