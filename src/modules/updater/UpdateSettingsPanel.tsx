import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, RefreshCw, RotateCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/app-version";
import {
  SETTINGS_UPDATE_STATUS,
  useSettingsWindowUpdater,
  type SettingsUpdateInfoDto,
} from "@/modules/settings/settings-window-entry";

function StatusMessage({ status }: { status: SettingsUpdateInfoDto }) {
  const { t } = useTranslation("updater");

  switch (status.kind) {
    case SETTINGS_UPDATE_STATUS.IDLE:
      return <span className="text-sm text-text-muted">{t("panel.upToDate")}</span>;
    case SETTINGS_UPDATE_STATUS.CHECKING:
      return (
        <span className="flex items-center gap-2 text-sm text-text-muted">
          <RotateCw className="h-3.5 w-3.5 animate-spin" />
          {t("panel.checking")}
        </span>
      );
    case SETTINGS_UPDATE_STATUS.AVAILABLE:
      return (
        <span className="text-sm font-medium text-primary-strong">
          {t("panel.updateAvailable", { version: status.version })}
        </span>
      );
    case SETTINGS_UPDATE_STATUS.DOWNLOADING:
      return (
        <div className="w-full max-w-xs">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-text-muted">{t("panel.downloading")}</span>
            <span className="font-medium text-text">{status.progress.percentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${status.progress.percentage}%` }}
            />
          </div>
        </div>
      );
    case SETTINGS_UPDATE_STATUS.READY_TO_INSTALL:
      return (
        <span className="text-sm font-medium text-success">
          {t("panel.readyToRestart")}
        </span>
      );
    case SETTINGS_UPDATE_STATUS.ERROR:
      return <span className="text-sm text-danger">{t("panel.genericError")}</span>;
  }
}

export function UpdateSettingsPanel() {
  const { t } = useTranslation("updater");
  const updater = useSettingsWindowUpdater();
  const status = updater.status;

  async function runUpdaterAction(action: () => Promise<void>) {
    try {
      await action();
    } catch {
      toast.error(t("panel.genericError"));
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-primary/20 bg-primary/10 text-primary">
          <Download className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-text">{t("panel.title")}</h3>
          <p className="mt-1 text-xs text-text-dim">{t("panel.manualDescription")}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-border py-3">
        <span className="text-sm font-medium text-text">
          {t("panel.currentVersionLabel")}
        </span>
        <span className="font-mono-tabular text-xs text-text-muted">{APP_VERSION}</span>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-3">
        <StatusMessage status={status} />

        <div className="flex items-center gap-2">
          {status.kind === SETTINGS_UPDATE_STATUS.IDLE ||
          status.kind === SETTINGS_UPDATE_STATUS.ERROR ? (
            <Button
              variant="outline"
              size="small"
              onClick={() => void runUpdaterAction(updater.checkForUpdates)}
              disabled={updater.isChecking}
            >
              <Search className="h-3.5 w-3.5" />
              {t("panel.checkButton")}
            </Button>
          ) : null}

          {status.kind === SETTINGS_UPDATE_STATUS.AVAILABLE ? (
            <Button
              variant="default"
              size="small"
              onClick={() => void runUpdaterAction(updater.downloadAndInstall)}
              disabled={updater.isDownloading}
            >
              <Download className="h-3.5 w-3.5" />
              {t("panel.downloadAndInstall")}
            </Button>
          ) : null}

          {status.kind === SETTINGS_UPDATE_STATUS.READY_TO_INSTALL ? (
            <Button
              variant="default"
              size="small"
              onClick={() => void runUpdaterAction(updater.relaunch)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("panel.restart")}
            </Button>
          ) : null}

          {status.kind === SETTINGS_UPDATE_STATUS.ERROR ? (
            <Button
              variant="outline"
              size="small"
              onClick={() => void runUpdaterAction(updater.checkForUpdates)}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {t("panel.tryAgain")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
