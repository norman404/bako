import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, RefreshCw, RotateCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { APP_VERSION } from "@/lib/app-version";
import {
  requestSettingsOperation,
  SETTINGS_RPC_OPERATION,
  SETTINGS_UPDATE_STATUS,
  useSettingsWindowStore,
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
  const { t } = useTranslation(["updater", "settings"]);
  const updater = useSettingsWindowUpdater();
  const flags = useSettingsWindowStore((state) => state.snapshot?.flags);
  const [isUpdatingAutoUpdate, setIsUpdatingAutoUpdate] = useState(false);

  if (!flags) return null;

  const autoUpdateEnabled = flags.auto_update_enabled ?? true;
  const status = updater.status;

  async function runUpdaterAction(action: () => Promise<void>) {
    try {
      await action();
    } catch {
      toast.error(t("updater:panel.genericError"));
    }
  }

  async function updateAutoUpdate(checked: boolean) {
    setIsUpdatingAutoUpdate(true);
    try {
      const updated = await requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG, {
        key: "auto_update_enabled",
        value: checked,
      });
      useSettingsWindowStore.getState().applySnapshot(updated);
    } catch {
      toast.error(t("settings:featureFlags.updateError"));
    } finally {
      setIsUpdatingAutoUpdate(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-primary/20 bg-primary/10 text-primary">
          <Download className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-text">{t("updater:panel.title")}</h3>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-border py-3">
        <span className="text-sm font-medium text-text">
          {t("updater:panel.currentVersionLabel")}
        </span>
        <span className="font-mono-tabular text-xs text-text-muted">{APP_VERSION}</span>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-3">
        <div className="grid gap-0.5">
          <Label htmlFor="auto-update-enabled" className="text-sm font-medium text-text">
            {t("updater:panel.autoUpdateLabel")}
          </Label>
          <p className="text-xs text-text-dim">{t("updater:panel.autoUpdateDescription")}</p>
        </div>
        <Switch
          id="auto-update-enabled"
          aria-label={t("updater:panel.autoUpdateLabel")}
          checked={autoUpdateEnabled}
          onCheckedChange={(checked) => void updateAutoUpdate(checked)}
          disabled={isUpdatingAutoUpdate}
        />
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
              {t("updater:panel.checkButton")}
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
              {t("updater:panel.downloadAndInstall")}
            </Button>
          ) : null}

          {status.kind === SETTINGS_UPDATE_STATUS.READY_TO_INSTALL ? (
            <Button
              variant="default"
              size="small"
              onClick={() => void runUpdaterAction(updater.relaunch)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("updater:panel.restart")}
            </Button>
          ) : null}

          {status.kind === SETTINGS_UPDATE_STATUS.ERROR ? (
            <Button
              variant="outline"
              size="small"
              onClick={() => void runUpdaterAction(updater.checkForUpdates)}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {t("updater:panel.tryAgain")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
