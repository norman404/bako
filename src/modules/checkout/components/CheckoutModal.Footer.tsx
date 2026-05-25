import { LoaderCircle } from "lucide-react";

import type { CartTotals } from "@/modules/order/domain/cart";
import { Button } from "@/components/ui/Button";
import { formatPosCurrency } from "@/lib/currency";

interface CheckoutModalFooterActionsProps {
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDisabled: boolean;
  isSubmitting: boolean;
  totals: CartTotals;
}

function CheckoutModalFooterActions({
  onClose,
  onConfirm,
  isDisabled,
  isSubmitting,
  totals,
}: CheckoutModalFooterActionsProps) {
  return (
    <footer className="grid grid-cols-[1fr_1.45fr] gap-2.5 border-t border-hairline px-4 py-3 sm:px-5">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
        className="h-10 text-[11px] uppercase tracking-[0.16em]"
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={() => void onConfirm()}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className="h-10 justify-between gap-3 px-4 text-[12px] font-semibold uppercase tracking-[0.16em]"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        <span>{isSubmitting ? "Guardando" : "Pagar"}</span>
        <span className="font-mono-tabular text-[13px] font-semibold tracking-tight normal-case">
          {formatPosCurrency(totals.total)}
        </span>
      </Button>
    </footer>
  );
}

export { CheckoutModalFooterActions };
