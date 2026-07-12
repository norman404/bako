import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  /**
   * Whether the dialog is open. Controlled by the parent.
   */
  open: boolean;
  /**
   * Called when the user wants to close the dialog without confirming
   * (Cancel button, Escape key, click on overlay).
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Title of the dialog. Should be a short imperative phrase, e.g. "Archivar grupo".
   */
  title: string;
  /**
   * Longer description / message explaining what will happen, e.g.
   * "¿Archivar 'Nivel de hielo'? Esta acción no se puede deshacer."
   */
  description: ReactNode;
  /**
   * Label of the confirm button. Defaults to a translation of "Confirm".
   */
  confirmLabel?: string;
  /**
   * Label of the cancel button. Defaults to a translation of "Cancel".
   */
  cancelLabel?: string;
  /**
   * Visual variant of the confirm button. `danger` for destructive actions
   * (archive, delete), `default` for neutral confirmations.
   */
  confirmVariant?: "default" | "danger";
  /**
   * Whether the action is in flight. Disables both buttons and shows
   * a subtle indicator on the confirm button.
   */
  isLoading?: boolean;
  /**
   * Called when the user clicks the confirm button.
   */
  onConfirm: () => void;
}

export { ConfirmDialog };

/**
 * Generic confirmation dialog. Replaces `window.confirm` in flows that
 * run inside Tauri (where the native browser confirm is unreliable or
 * does not appear at all).
 *
 * Accessibility:
 * - The dialog has `role="alertdialog"` so screen readers announce it
 *   as requiring immediate attention.
 * - Focus is trapped inside the dialog by Radix and returns to the
 *   trigger element on close.
 * - Pressing Escape closes the dialog (treated as Cancel).
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "default",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = () => {
    setInternalLoading(true);
    try {
      onConfirm();
    } finally {
      // The parent usually triggers a state change that closes the dialog,
      // but we still reset the loading flag for the next open.
      setInternalLoading(false);
    }
  };

  const showLoading = isLoading || internalLoading;
  const resolvedConfirmLabel = confirmLabel ?? t("confirm");
  const resolvedCancelLabel = cancelLabel ?? t("cancel");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog" className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-danger/30 bg-danger/10 text-danger"
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-md">{title}</DialogTitle>
              <DialogDescription className="mt-1.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex-row justify-end gap-2 sm:mt-4">
          <Button
            type="button"
            variant="ghost"
            size="small"
            onClick={() => onOpenChange(false)}
            disabled={showLoading}
          >
            {resolvedCancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="small"
            onClick={handleConfirm}
            disabled={showLoading}
            data-testid="confirm-dialog-confirm"
          >
            {resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
