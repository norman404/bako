import type { DatabaseBackupPort } from "./ports";
import { recordDatabaseRestoreFailure } from "./lib/database-restore-notice";

export async function performDatabaseExport(
  port: DatabaseBackupPort,
  destination: string,
): Promise<void> {
  await port.exportDatabase(destination);
}

export async function performDatabaseRestore(
  port: DatabaseBackupPort,
  source: string,
): Promise<boolean> {
  await port.validateDatabase(source);
  await port.createRestoreBackup();
  let databaseClosed = false;

  try {
    await port.closeDatabase();
    databaseClosed = true;
    await port.restoreDatabase(source);
  } catch (error) {
    if (databaseClosed) {
      recordDatabaseRestoreFailure();
      await port.relaunchApplication().catch(() => undefined);
    }
    throw error;
  }

  try {
    await port.relaunchApplication();
  } catch (error) {
    recordDatabaseRestoreFailure();
    throw error;
  }

  return true;
}
