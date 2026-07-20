import { describe, expect, it, mock, type Mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";

// The updater status MUST be a single source of truth shared across every
// consumer (the App toast + the Settings panel). We mock the adapter so the
// check resolves a controlled update without needing the Tauri runtime.
mock.module("@/modules/updater/adapters/tauri-updater.adapter", () => ({
  checkForUpdate: mock(),
  downloadAndInstallUpdate: mock(),
  relaunchApplication: mock(),
}));

import { checkForUpdate, type UpdateHandle } from "@/modules/updater/adapters/tauri-updater.adapter";
import { createAvailableStatus } from "@/modules/updater/domain/update-status";

import { useUpdater } from "./use-updater";

const checkForUpdateMock = checkForUpdate as Mock<typeof checkForUpdate>;

describe("useUpdater — shared state", () => {
  it("exposes the same status to every consumer (single source of truth)", async () => {
    const handle: UpdateHandle = {
      version: "2026.6.2",
      notes: "shared",
      downloadAndInstall: mock(() => Promise.resolve()),
    };
    checkForUpdateMock.mockResolvedValue({
      version: "2026.6.2",
      notes: "shared",
      handle,
    });

    // Two independent consumers, like App.tsx + UpdateSettingsPanel.
    const { result: consumerA } = renderHook(() => useUpdater());
    const { result: consumerB } = renderHook(() => useUpdater());

    // Only consumer A triggers the check.
    await act(async () => {
      await consumerA.current.checkForUpdates();
    });

    // Consumer B never called anything, but MUST observe the shared status.
    expect(consumerB.current.status).toEqual(
      createAvailableStatus({ version: "2026.6.2", notes: "shared" }),
    );
    expect(consumerB.current.hasUpdate).toBe(true);
  });
});