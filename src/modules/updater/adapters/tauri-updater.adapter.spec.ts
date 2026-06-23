import { describe, expect, it, vi } from "vitest";

import type { Update, DownloadEvent } from "@tauri-apps/plugin-updater";

import {
  checkForUpdate,
  downloadAndInstallUpdate,
  relaunchApplication,
  type UpdateHandle,
} from "./tauri-updater.adapter";

function buildTauriUpdate(overrides: Partial<Update> = {}): Update {
  return {
    version: "2026.6.2",
    body: "Bug fixes",
    currentVersion: "2026.6.1",
    date: "2026-06-15T00:00:00Z",
    rawJson: {},
    available: true,
    download: vi.fn(() => Promise.resolve()),
    install: vi.fn(() => Promise.resolve()),
    downloadAndInstall: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as Update;
}

describe("checkForUpdate", () => {
  it("returns update info when update is available", async () => {
    const update = buildTauriUpdate({ version: "2026.6.2", body: "Nuevas funciones" });
    const check = vi.fn(() => Promise.resolve(update));

    const result = await checkForUpdate({ check });

    expect(result).not.toBeNull();
    expect(result!.version).toBe("2026.6.2");
    expect(result!.notes).toBe("Nuevas funciones");
    expect(result!.handle.version).toBe("2026.6.2");
  });

  it("returns null when no update is available", async () => {
    const check = vi.fn(() => Promise.resolve(null));

    const result = await checkForUpdate({ check });

    expect(result).toBeNull();
  });

  it("throws when check fails", async () => {
    const check = vi.fn(() => Promise.reject(new Error("network error")));

    await expect(checkForUpdate({ check })).rejects.toThrow("network error");
  });
});

describe("downloadAndInstallUpdate", () => {
  it("calls downloadAndInstall on the handle", async () => {
    const downloadAndInstall = vi.fn((_: (event: DownloadEvent) => void) => Promise.resolve());
    const handle: UpdateHandle = {
      version: "2026.6.2",
      notes: "",
      downloadAndInstall,
    };

    await downloadAndInstallUpdate(handle, () => undefined);

    expect(downloadAndInstall).toHaveBeenCalledOnce();
  });

  it("forwards download events to progress callback", async () => {
    const events: DownloadEvent[] = [];
    const downloadAndInstall = vi.fn((onEvent: (event: DownloadEvent) => void) => {
      onEvent({ event: "Started", data: { contentLength: 1000 } });
      onEvent({ event: "Progress", data: { chunkLength: 500 } });
      onEvent({ event: "Finished" });
      return Promise.resolve();
    });
    const handle: UpdateHandle = {
      version: "2026.6.2",
      notes: "",
      downloadAndInstall,
    };

    await downloadAndInstallUpdate(handle, (event) => events.push(event));

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ event: "Started", data: { contentLength: 1000 } });
    expect(events[1]).toEqual({ event: "Progress", data: { chunkLength: 500 } });
    expect(events[2]).toEqual({ event: "Finished" });
  });

  it("throws when download fails", async () => {
    const downloadAndInstall = vi.fn(() => Promise.reject(new Error("download failed")));
    const handle: UpdateHandle = {
      version: "2026.6.2",
      notes: "",
      downloadAndInstall,
    };

    await expect(downloadAndInstallUpdate(handle, () => undefined)).rejects.toThrow(
      "download failed"
    );
  });
});

describe("relaunchApplication", () => {
  it("calls relaunch", async () => {
    const relaunch = vi.fn(() => Promise.resolve());

    await relaunchApplication({ relaunch });

    expect(relaunch).toHaveBeenCalledOnce();
  });

  it("throws when relaunch fails", async () => {
    const relaunch = vi.fn(() => Promise.reject(new Error("relaunch failed")));

    await expect(relaunchApplication({ relaunch })).rejects.toThrow("relaunch failed");
  });
});
