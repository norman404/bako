import { describe, expect, it, mock, beforeEach } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

mock.module("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "toast.availableTitle": `Actualización disponible: ${String(params?.version ?? "")}`,
        "toast.updateButton": "Actualizar ahora",
        "toast.downloadingTitle": "Descargando actualización...",
        "toast.readyTitle": `Listo para reiniciar (${String(params?.version ?? "")})`,
        "toast.restartButton": "Reiniciar ahora",
        "toast.errorTitle": "Error al buscar actualización",
        "toast.genericError": "No pudimos buscar actualizaciones. Intentá de nuevo.",
        "toast.checkingTitle": "Buscando actualizaciones...",
        "toast.dismiss": "Cerrar",
        "toast.tryAgain": "Reintentar",
      };
      return translations[key] ?? key;
    },
  }),
}));

import {
  createIdleStatus,
  createAvailableStatus,
  createDownloadingStatus,
  createReadyToInstallStatus,
  createErrorStatus,
  createCheckingStatus,
} from "@/modules/updater/domain/update-status";
import type { UseUpdaterResult } from "@/modules/updater/hooks/use-updater";

import { UpdateToast, type UpdateToastProps } from "./UpdateToast";

function buildUpdater(overrides: Partial<UseUpdaterResult> = {}): UseUpdaterResult {
  return {
    status: createIdleStatus(),
    isChecking: false,
    hasUpdate: false,
    isDownloading: false,
    isReadyToInstall: false,
    error: null,
    checkForUpdates: mock(),
    downloadAndInstall: mock(),
    relaunch: mock(),
    reset: mock(),
    ...overrides,
  };
}

function renderToast(props: Partial<UpdateToastProps> = {}) {
  return render(<UpdateToast updater={buildUpdater()} {...props} />);
}

describe("UpdateToast", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("renders nothing when idle", () => {
    const { container } = renderToast();
    expect(container.firstChild).toBeNull();
  });

  it("renders checking status", () => {
    renderToast({
      updater: buildUpdater({
        status: createCheckingStatus(),
        isChecking: true,
      }),
    });

    expect(screen.getByText(/Buscando actualizaciones/i)).toBeInTheDocument();
  });

  it("renders available update prompt", () => {
    const updater = buildUpdater({
      status: createAvailableStatus({ version: "2026.6.2", notes: "Bug fixes" }),
      hasUpdate: true,
    });

    renderToast({ updater });

    expect(screen.getByText(/2026.6.2/i)).toBeInTheDocument();
    expect(screen.getByText(/Bug fixes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /actualizar/i })).toBeInTheDocument();
  });

  it("calls downloadAndInstall when update button is clicked", async () => {
    const downloadAndInstall = mock();
    const updater = buildUpdater({
      status: createAvailableStatus({ version: "2026.6.2", notes: "" }),
      hasUpdate: true,
      downloadAndInstall,
    });

    renderToast({ updater });

    await userEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    expect(downloadAndInstall).toHaveBeenCalledOnce();
  });

  it("renders download progress", () => {
    const updater = buildUpdater({
      status: createDownloadingStatus({ downloaded: 500, contentLength: 1000 }),
      isDownloading: true,
    });

    renderToast({ updater });

    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });

  it("renders ready to install and calls relaunch on click", async () => {
    const relaunch = mock();
    const updater = buildUpdater({
      status: createReadyToInstallStatus("2026.6.2"),
      isReadyToInstall: true,
      relaunch,
    });

    renderToast({ updater });

    await userEvent.click(screen.getByRole("button", { name: /reiniciar/i }));

    expect(relaunch).toHaveBeenCalledOnce();
  });

  it("renders error state, allows retry and dismiss", async () => {
    const reset = mock();
    const checkForUpdates = mock();
    const updater = buildUpdater({
      status: createErrorStatus("check failed"),
      error: "check failed",
      reset,
      checkForUpdates,
    });

    renderToast({ updater });

    expect(screen.getByText(/No pudimos buscar actualizaciones/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(checkForUpdates).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(reset).toHaveBeenCalledOnce();
  });
});
