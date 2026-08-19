import { Copy, Database, Download, LoaderCircle, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { useSettingsWindowDatabaseBackup } from "../use-settings-window-database-backup";

function notifyOperationError(error: unknown, message: string): void {
  console.error("Database backup operation failed", error);
  toast.error(message);
}

export function DatabaseSettingsCard() {
  const { t } = useTranslation("settings");
  const [restoreSource, setRestoreSource] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const {
    info,
    isInfoLoading,
    isBusy,
    chooseRestoreSource,
    requestExport,
    requestRestore,
  } = useSettingsWindowDatabaseBackup();

  async function handleExport() {
    try {
      const exported = await requestExport();
      if (exported) {
        toast.success(t("database.exportSuccess"));
      }
    } catch (error) {
      notifyOperationError(error, t("database.operationError"));
    }
  }

  async function handleChooseRestoreSource() {
    if (isBusy) return;

    try {
      const source = await chooseRestoreSource();
      if (source) {
        setRestoreSource(source);
        setIsConfirmOpen(true);
      }
    } catch (error) {
      notifyOperationError(error, t("database.operationError"));
    }
  }

  async function handleRestore() {
    if (!restoreSource) return;

    setIsConfirmOpen(false);
    try {
      const restored = await requestRestore(restoreSource);
      if (restored) {
        toast.success(t("database.restoreSuccess"));
      }
    } catch (error) {
      notifyOperationError(error, t("database.operationError"));
    } finally {
      setRestoreSource(null);
    }
  }

  async function handleCopyPath() {
    if (!info?.path || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(info.path);
      toast.success(t("database.copySuccess"));
    } catch (error) {
      notifyOperationError(error, t("database.operationError"));
    }
  }

  const operationLabel = isBusy
    ? t("database.working")
    : t("database.description");

  return (
    <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-primary/20 bg-primary/10 text-primary">
          <Database className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-text">{t("database.title")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{operationLabel}</p>
        </div>
      </div>

      <div className="mt-3 rounded-card border border-border bg-surface-sunken/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-dim">
              {t("database.locationLabel")}
            </p>
            {isInfoLoading ? (
              <LoaderCircle
                className="mt-2 h-4 w-4 animate-spin text-text-muted"
                aria-label={t("database.loading")}
              />
            ) : (
              <code className="mt-2 block break-all text-2xs text-text-muted" title={info?.path}>
                {info?.path ?? t("database.locationUnavailable")}
              </code>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("database.copyPathAriaLabel")}
            onClick={handleCopyPath}
            disabled={isBusy || !info?.path}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="small"
          onClick={() => void handleExport()}
          disabled={isBusy || isInfoLoading}
          data-testid="database-export-button"
        >
          <Download className="h-3.5 w-3.5" />
          {t("database.exportButton")}
        </Button>
        <Button
          variant="danger"
          size="small"
          onClick={() => void handleChooseRestoreSource()}
          disabled={isBusy}
          data-testid="database-restore-button"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("database.restoreButton")}
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("database.restoreConfirmTitle")}
        description={t("database.restoreConfirmDescription")}
        confirmLabel={t("database.restoreConfirmButton")}
        confirmVariant="danger"
        isLoading={isBusy}
        onConfirm={() => void handleRestore()}
      />
    </div>
  );
}
