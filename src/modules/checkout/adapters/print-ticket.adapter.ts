import { ResultAsync, errAsync } from "neverthrow";

import { buildPrintTicketHtml, type PrintOrderOptions } from "@/modules/checkout/lib/print-ticket-template";

const PRINT_WINDOW_RENDER_DELAY_MS = 160;
const PRINT_WINDOW_CLOSE_DELAY_MS = 1_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function schedulePrintWindowClose(printWindow: Window): void {
  const closeWindow = () => {
    if (!printWindow.closed) {
      printWindow.close();
    }
  };

  printWindow.addEventListener("afterprint", closeWindow, { once: true });
  window.setTimeout(closeWindow, PRINT_WINDOW_CLOSE_DELAY_MS);
}

function normalizePrintError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("No pudimos lanzar la impresión del ticket.");
}

export function printOrder(input: PrintOrderOptions): ResultAsync<void, Error> {
  if (typeof window === "undefined") {
    return errAsync(new Error("La impresión del ticket solo está disponible desde la caja."));
  }

  const printWindow = window.open(
    "",
    `coffee-pos-ticket-${input.ticketNumber}`,
    "width=420,height=720",
  );

  if (!printWindow) {
    return errAsync(new Error("No pudimos abrir la ventana de impresión del ticket."));
  }

  const printAsync = async (): Promise<void> => {
    printWindow.document.open();
    printWindow.document.write(buildPrintTicketHtml(input));
    printWindow.document.close();

    await delay(PRINT_WINDOW_RENDER_DELAY_MS);

    if (printWindow.closed) {
      throw new Error("La ventana de impresión se cerró antes de iniciar la impresión.");
    }

    schedulePrintWindowClose(printWindow);
    printWindow.focus();
    printWindow.print();
  };

  return ResultAsync.fromPromise(printAsync(), (error) => {
    if (!printWindow.closed) {
      printWindow.close();
    }
    return normalizePrintError(error);
  });
}
