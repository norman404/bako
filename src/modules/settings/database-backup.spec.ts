import { describe, expect, it, mock } from "bun:test";

import { performDatabaseExport, performDatabaseRestore } from "./database-backup";
import type { DatabaseBackupPort } from "./ports";

function createPort(events: string[]): DatabaseBackupPort {
  return {
    exportDatabase: mock(async () => {
      events.push("export");
    }),
    validateDatabase: mock(async () => {
      events.push("validate");
    }),
    createRestoreBackup: mock(async () => {
      events.push("checkpoint");
    }),
    closeDatabase: mock(async () => {
      events.push("close");
    }),
    restoreDatabase: mock(async () => {
      events.push("restore");
    }),
    relaunchApplication: mock(async () => {
      events.push("relaunch");
    }),
  };
}

describe("performDatabaseExport", () => {
  it("exports to the selected destination", async () => {
    // CASE: operator selected a destination for a database backup.
    // VALIDATES: the port receives exactly that destination.
    const events: string[] = [];
    const port = createPort(events);

    await performDatabaseExport(port, "/backups/bako.sqlite");

    expect(port.exportDatabase).toHaveBeenCalledWith("/backups/bako.sqlite");
    expect(events).toEqual(["export"]);
  });
});

describe("performDatabaseRestore", () => {
  it("validates, checkpoints, closes, restores, and relaunches in order", async () => {
    // CASE: operator confirmed a valid database backup.
    // VALIDATES: the destructive flow protects the current database before replacement.
    const events: string[] = [];
    const port = createPort(events);

    await performDatabaseRestore(port, "/backups/bako.sqlite");

    expect(events).toEqual(["validate", "checkpoint", "close", "restore", "relaunch"]);
  });

  it("does not close the live database when validation fails", async () => {
    // CASE: the selected file is not a valid Bako backup.
    // VALIDATES: validation errors leave the current connection untouched.
    const events: string[] = [];
    const port = createPort(events);
    port.validateDatabase = mock(async () => {
      events.push("validate");
      throw new Error("invalid backup");
    });

    await expect(performDatabaseRestore(port, "/backups/bako.sqlite")).rejects.toThrow(
      "invalid backup",
    );

    expect(events).toEqual(["validate"]);
  });

  it("relaunches after a restore failure so the closed connection is not reused", async () => {
    // CASE: the database connection was closed but file replacement failed.
    // VALIDATES: the application recovers by reopening its database on relaunch.
    const events: string[] = [];
    const port = createPort(events);
    port.restoreDatabase = mock(async () => {
      events.push("restore");
      throw new Error("invalid backup");
    });

    await expect(performDatabaseRestore(port, "/backups/bako.sqlite")).rejects.toThrow(
      "invalid backup",
    );

    expect(events).toEqual(["validate", "checkpoint", "close", "restore", "relaunch"]);
  });
});
