import { describe, expect, it, mock } from "bun:test";

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
    download: mock(() => Promise.resolve()),
    install: mock(() => Promise.resolve()),
    downloadAndInstall: mock(() => Promise.resolve()),
    close: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as Update;
}

describe("checkForUpdate", () => {
  it("returns update info when update is available", async () => {
    const update = buildTauriUpdate({ version: "2026.6.2", body: "Nuevas funciones" });
    const check = mock(() => Promise.resolve(update));

    const result = await checkForUpdate({ check });

    expect(result).not.toBeNull();
    expect(result!.version).toBe("2026.6.2");
    expect(result!.notes).toBe("Nuevas funciones");
    expect(result!.handle.version).toBe("2026.6.2");
  });

  it("returns null when no update is available", async () => {
    const check = mock(() => Promise.resolve(null));

    const result = await checkForUpdate({ check });

    expect(result).toBeNull();
  });

  it("throws when check fails", async () => {
    const check = mock(() => Promise.reject(new Error("network error")));

    await expect(checkForUpdate({ check })).rejects.toThrow("network error");
  });
});

describe("downloadAndInstallUpdate", () => {
  it("calls downloadAndInstall on the handle", async () => {
    const downloadAndInstall = mock((_: (event: DownloadEvent) => void) => Promise.resolve());
    const handle: UpdateHandle = {
      version: "2026.6.2",
      notes: "",
      downloadAndInstall,
    };

    await downloadAndInstallUpdate(handle, () => undefined);

    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
  });

  it("forwards download events to progress callback", async () => {
    const events: DownloadEvent[] = [];
    const downloadAndInstall = mock((onEvent: (event: DownloadEvent) => void) => {
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
    const downloadAndInstall = mock(() => Promise.reject(new Error("download failed")));
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
    const relaunch = mock(() => Promise.resolve());

    await relaunchApplication({ relaunch });

    expect(relaunch).toHaveBeenCalledTimes(1);
  });

  it("throws when relaunch fails", async () => {
    const relaunch = mock(() => Promise.reject(new Error("relaunch failed")));

    await expect(relaunchApplication({ relaunch })).rejects.toThrow("relaunch failed");
  });
});
