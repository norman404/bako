const DATABASE_RESTORE_FAILURE_KEY = "bako:database-restore-failure";

function recordDatabaseRestoreFailure(): void {
  try {
    localStorage.setItem(DATABASE_RESTORE_FAILURE_KEY, "1");
  } catch {
    // Storage can be unavailable in restricted WebViews; restart still recovers the DB.
  }
}

function consumeDatabaseRestoreFailure(): boolean {
  try {
    const hasFailure = localStorage.getItem(DATABASE_RESTORE_FAILURE_KEY) === "1";
    if (hasFailure) {
      localStorage.removeItem(DATABASE_RESTORE_FAILURE_KEY);
    }
    return hasFailure;
  } catch {
    return false;
  }
}

export { consumeDatabaseRestoreFailure, recordDatabaseRestoreFailure };
