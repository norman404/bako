import { describe, expect, it, mock } from "bun:test";
import userEvent from "@testing-library/user-event";

import type { DatabaseBackupService } from "../domain/database-backup";
import { DatabaseSettingsCard } from "./DatabaseSettingsCard";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

function createService(): DatabaseBackupService {
  return {
    getDatabaseInfo: mock(() => Promise.resolve({
      path: "/Users/test/Library/Application Support/com.norman404.bako/bako.db",
      exists: true,
      sizeBytes: 4096,
    })),
    chooseExportDestination: mock(() => Promise.resolve("/tmp/bako.sqlite")),
    chooseRestoreSource: mock(() => Promise.resolve("/tmp/restore.sqlite")),
    exportDatabase: mock(() => Promise.resolve()),
    validateDatabase: mock(() => Promise.resolve()),
    createRestoreBackup: mock(() => Promise.resolve()),
    closeDatabase: mock(() => Promise.resolve()),
    restoreDatabase: mock(() => Promise.resolve()),
    relaunchApplication: mock(() => Promise.resolve()),
  };
}

describe("DatabaseSettingsCard", () => {
  it("shows the resolved database path and exports a selected backup", async () => {
    // CASE: operator opens the database section and chooses a backup destination.
    // VALIDATES: the path is visible and the export operation receives the selected file.
    const service = createService();
    const user = userEvent.setup();

    renderWithProviders(<DatabaseSettingsCard service={service} />);

    expect(await screen.findByText(/Users\/test\/Library/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /descargar/i }));

    await waitFor(() => {
      expect(service.exportDatabase).toHaveBeenCalledWith("/tmp/bako.sqlite");
    });
  });

  it("requires confirmation before restoring and performs the approved flow", async () => {
    // CASE: operator selects a backup and confirms replacing the current database.
    // VALIDATES: cancel does not restore, while confirm executes the protected flow.
    const service = createService();
    const user = userEvent.setup();

    renderWithProviders(<DatabaseSettingsCard service={service} />);

    await user.click(screen.getByRole("button", { name: /restaurar/i }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(service.restoreDatabase).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("database-restore-button"));
    await user.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(service.restoreDatabase).toHaveBeenCalledWith("/tmp/restore.sqlite");
      expect(service.relaunchApplication).toHaveBeenCalledTimes(1);
    });
  });
});
