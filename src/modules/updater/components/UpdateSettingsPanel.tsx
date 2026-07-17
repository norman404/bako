import type { TFunction } from "i18next";
import { Download, RefreshCw, RotateCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { APP_VERSION } from "@/lib/app-version";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { useUpdater } from "@/modules/updater";
import {
  UpdateStatus,
  type UpdateInfo,
} from "@/modules/updater/domain/update-status";

function translateUpdaterMessage(_message: string, t: TFunction): string {
  return t("panel.genericError");
}

function StatusMessage({ status }: { status: UpdateInfo }) {
  const { t } = useTranslation("updater");

  switch (status.kind) {
    case UpdateStatus.Idle:
      return <span className="text-sm text-text-muted">{t("panel.upToDate")}</span>;
    case UpdateStatus.Checking:
      return (
        <span className="flex items-center gap-2 text-sm text-text-muted">
          <RotateCw className="h-3.5 w-3.5 animate-spin" />
          {t("panel.checking")}
        </span>
      );
    case UpdateStatus.Available:
      return (
        <span className="text-sm font-medium text-primary-strong">
          {t("panel.updateAvailable", { version: status.version })}
        </span>
      );
    case UpdateStatus.Downloading:
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
    case UpdateStatus.ReadyToInstall:
      return (
        <span className="text-sm font-medium text-success">
          {t("panel.readyToRestart")}
        </span>
      );
    case UpdateStatus.Error:
      return <span className="text-sm text-danger">{translateUpdaterMessage(status.message, t)}</span>;
    default:
      return null;
  }
}

export function UpdateSettingsPanel() {
  const { t } = useTranslation(["updater", "settings"]);
  const updater = useUpdater();
  const { flags, setFlag } = useFeatureFlagsStore();

  const autoUpdateEnabled = flags.auto_update_enabled ?? true;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-surface-sunken/30 overflow-hidden">

        {/* Version info row */}
        <div className="px-5">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium text-text">
                {t("updater:panel.title")}
              </span>
              <span className="text-xs text-text-dim">
                {t("updater:panel.currentVersionLabel")}: {APP_VERSION}
              </span>
            </div>
          </div>
        </div>

        {/* Auto-update toggle row */}
        <div className="px-5">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="grid gap-0.5">
              <Label htmlFor="auto-update-enabled" className="text-sm font-medium text-text">
                {t("updater:panel.autoUpdateLabel")}
              </Label>
              <p className="text-xs text-text-dim">{t("updater:panel.autoUpdateDescription")}</p>
            </div>
            <Checkbox
              id="auto-update-enabled"
              checked={autoUpdateEnabled}
              onCheckedChange={(checked) => {
                setFlag("auto_update_enabled", checked as boolean);
              }}
            />
          </div>
        </div>

        {/* Status + actions row */}
        <div className="px-5">
          <div className="flex items-center justify-between py-3">
          <StatusMessage status={updater.status} />

          <div className="flex items-center gap-2">
            {updater.status.kind === UpdateStatus.Idle ||
            updater.status.kind === UpdateStatus.Error ? (
              <Button
                variant="outline"
                size="small"
                onClick={() => updater.checkForUpdates()}
                disabled={updater.isChecking}
              >
                <Search className="h-3.5 w-3.5" />
                {t("updater:panel.checkButton")}
              </Button>
            ) : null}

            {updater.status.kind === UpdateStatus.Available ? (
              <Button
                variant="default"
                size="small"
                onClick={() => updater.downloadAndInstall()}
                disabled={updater.isDownloading}
              >
                <Download className="h-3.5 w-3.5" />
                {t("updater:panel.downloadAndInstall")}
              </Button>
            ) : null}

            {updater.status.kind === UpdateStatus.ReadyToInstall ? (
              <Button
                variant="default"
                size="small"
                onClick={() => updater.relaunch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("updater:panel.restart")}
              </Button>
            ) : null}

            {updater.status.kind === UpdateStatus.Error ? (
              <Button
                variant="outline"
                size="small"
                onClick={() => updater.checkForUpdates()}
              >
                <RotateCw className="h-3.5 w-3.5" />
                {t("updater:panel.tryAgain")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
