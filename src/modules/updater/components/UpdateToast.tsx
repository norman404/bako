import { Download, RefreshCw, AlertCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { UseUpdaterResult } from "@/modules/updater/hooks/use-updater";
import {
  UpdateStatus,
  type UpdateInfo,
} from "@/modules/updater/domain/update-status";

export interface UpdateToastProps {
  updater: UseUpdaterResult;
}

function AvailableToast({
  updater,
  status,
}: {
  updater: UseUpdaterResult;
  status: Extract<UpdateInfo, { kind: UpdateStatus.Available }>;
}) {
  const { t } = useTranslation("updater");

  return (
    <>
      <p className="text-sm font-medium text-text">
        {t("toast.availableTitle", { version: status.version })}
      </p>
      {status.notes ? (
        <p className="mt-1 text-xs text-text-muted line-clamp-3">{status.notes}</p>
      ) : null}
      <button
        type="button"
        onClick={updater.downloadAndInstall}
        className="mt-3 inline-flex items-center justify-center rounded-sharp bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-strong"
      >
        {t("toast.updateButton")}
      </button>
    </>
  );
}

function DownloadingToast({
  status,
}: {
  status: Extract<UpdateInfo, { kind: UpdateStatus.Downloading }>;
}) {
  const { t } = useTranslation("updater");

  return (
    <>
      <p className="text-sm font-medium text-text">{t("toast.downloadingTitle")}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${status.progress.percentage}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-muted">{status.progress.percentage}%</p>
    </>
  );
}

function ReadyToInstallToast({
  updater,
  status,
}: {
  updater: UseUpdaterResult;
  status: Extract<UpdateInfo, { kind: UpdateStatus.ReadyToInstall }>;
}) {
  const { t } = useTranslation("updater");

  return (
    <>
      <p className="text-sm font-medium text-text">
        {t("toast.readyTitle", { version: status.version })}
      </p>
      <button
        type="button"
        onClick={updater.relaunch}
        className="mt-3 inline-flex items-center justify-center rounded-sharp bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-strong"
      >
        {t("toast.restartButton")}
      </button>
    </>
  );
}

function ErrorToast({ updater }: { updater: UseUpdaterResult; error: string }) {
  const { t } = useTranslation("updater");
  const displayError = t("toast.genericError");

  return (
    <>
      <p className="text-sm font-medium text-text">{t("toast.errorTitle")}</p>
      <p className="mt-1 text-xs text-danger">{displayError}</p>
      <button
        type="button"
        onClick={updater.checkForUpdates}
        className="mt-3 inline-flex items-center justify-center rounded-sharp bg-surface-sunken px-3 py-1.5 text-xs font-medium text-text hover:bg-border"
      >
        {t("toast.tryAgain")}
      </button>
    </>
  );
}

function CheckingToast() {
  const { t } = useTranslation("updater");

  return <p className="text-sm font-medium text-text">{t("toast.checkingTitle")}</p>;
}

export function UpdateToast({ updater }: UpdateToastProps) {
  const { t } = useTranslation("updater");
  const { status, isReadyToInstall, isDownloading, error } = updater;

  if (status.kind === UpdateStatus.Idle) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-card border border-border-strong bg-surface-raised shadow-modal">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          {isReadyToInstall ? (
            <RefreshCw className="h-5 w-5 text-primary" />
          ) : isDownloading ? (
            <Download className="h-5 w-5 text-primary" />
          ) : error ? (
            <AlertCircle className="h-5 w-5 text-danger" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {(() => {
            switch (status.kind) {
              case UpdateStatus.Available:
                return <AvailableToast updater={updater} status={status} />;
              case UpdateStatus.Downloading:
                return <DownloadingToast status={status} />;
              case UpdateStatus.ReadyToInstall:
                return <ReadyToInstallToast updater={updater} status={status} />;
              case UpdateStatus.Error:
                return <ErrorToast updater={updater} error="" />;
              case UpdateStatus.Checking:
                return <CheckingToast />;
              default:
                return null;
            }
          })()}
        </div>

        <button
          type="button"
          onClick={updater.reset}
          className="shrink-0 rounded-sharp p-1 text-text-muted hover:bg-surface-sunken hover:text-text"
          aria-label={t("toast.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
