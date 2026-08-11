import { AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useVoidOrder } from "../use-order-management";
import { translateShiftError } from "../lib/translate-shift-error";

interface VoidOrderConfirmProps {
  orderId: string;
  ticketNumber: number;
  open: boolean;
  onClose: () => void;
}

export function VoidOrderConfirm({ orderId, ticketNumber, open, onClose }: VoidOrderConfirmProps) {
  const { t } = useTranslation("shift");
  const voidOrderMutation = useVoidOrder();

  const handleVoid = () => {
    voidOrderMutation.mutate(orderId, {
      onSuccess: () => {
        toast.success(t("orderVoided", { ticketNumber }));
        onClose();
      },
      onError: (error) => {
        toast.error(translateShiftError(error, t));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("confirmVoidOrder")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("confirmVoidOrderDescription", { ticketNumber })}
        </DialogDescription>

        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-sunken">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>

            <h3 className="mt-4 font-display text-xl text-primary-strong">
              {t("confirmVoidOrder")}
            </h3>
            <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-text-muted">
              {t("confirmVoidOrderDescription", { ticketNumber: `#${ticketNumber}` })}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={voidOrderMutation.isPending}
              className="h-10 rounded-card text-sm font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={handleVoid}
              disabled={voidOrderMutation.isPending}
              className="group h-10 rounded-card bg-danger text-sm font-semibold text-on-primary hover:bg-danger-strong"
            >
              <span className="flex items-center gap-1.5">
                {voidOrderMutation.isPending ? t("voiding") : t("voidOrder")}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
