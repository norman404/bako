import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

import { closeDatabase } from "@/shared/db/client";
import type { DatabaseBackupService, DatabaseInfo } from "../domain/database-backup";

const DATABASE_FILTERS = [
  { name: "SQLite", extensions: ["sqlite", "db"] },
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function createBackupFilename(date: Date): string {
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("") + "-" + [pad(date.getHours()), pad(date.getMinutes())].join("");

  return `bako-backup-${timestamp}.sqlite`;
}

export const tauriDatabaseBackupService: DatabaseBackupService = {
  getDatabaseInfo: () => invoke<DatabaseInfo>("get_database_info"),

  chooseExportDestination: () =>
    save({
      defaultPath: createBackupFilename(new Date()),
      filters: DATABASE_FILTERS,
    }),

  chooseRestoreSource: async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: DATABASE_FILTERS,
    });

    return typeof selected === "string" ? selected : null;
  },

  exportDatabase: (destination) =>
    invoke("export_database", { destination }),

  validateDatabase: (source) =>
    invoke("validate_database", { source }),

  createRestoreBackup: () => invoke("prepare_database_restore"),

  closeDatabase,

  restoreDatabase: (source) => invoke("restore_database", { source }),

  relaunchApplication: relaunch,
};

export { createBackupFilename };
