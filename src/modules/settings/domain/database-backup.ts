export interface DatabaseInfo {
  path: string;
  exists: boolean;
  sizeBytes: number | null;
}

export interface DatabaseBackupPort {
  exportDatabase(destination: string): Promise<void>;
  validateDatabase(source: string): Promise<void>;
  createRestoreBackup(): Promise<void>;
  closeDatabase(): Promise<void>;
  restoreDatabase(source: string): Promise<void>;
  relaunchApplication(): Promise<void>;
}

export interface DatabaseBackupService extends DatabaseBackupPort {
  getDatabaseInfo(): Promise<DatabaseInfo>;
  chooseExportDestination(): Promise<string | null>;
  chooseRestoreSource(): Promise<string | null>;
}
