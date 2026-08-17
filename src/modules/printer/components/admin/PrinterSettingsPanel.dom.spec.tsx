import { describe, expect, it, mock, spyOn, beforeEach } from "bun:test";
import { toast } from "sonner";

import * as printerHooks from "@/modules/printer/hooks/use-printers";
import * as settingsStore from "@/modules/settings/store/settings-store";
import * as testPrinterModule from "@/modules/printer/adapters/test-printer.adapter";
import * as usbAdapterModule from "@/modules/printer/adapters/list-usb-printers.adapter";
import { PrinterSettingsPanel } from "@/modules/printer/components/admin/PrinterSettingsPanel";
import { fireEvent, renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { buildPrinter } from "@/modules/printer/test/factories";
import { PRINTER_ROLE, PRINTER_TYPE } from "@/modules/printer/domain/printer";
import type { Printer } from "@/modules/printer/domain/printer";

type UsePrintersResult = ReturnType<typeof printerHooks.usePrinters>;
type UseCreatePrinterResult = ReturnType<typeof printerHooks.useCreatePrinter>;
type UseUpdatePrinterResult = ReturnType<typeof printerHooks.useUpdatePrinter>;
type UseArchivePrinterResult = ReturnType<typeof printerHooks.useArchivePrinter>;

function mockAllHooks(opts: {
  printers?: Printer[];
  updateMutate?: ReturnType<typeof mock>;
  archiveMutate?: ReturnType<typeof mock>;
} = {}) {
  const printers = opts.printers ?? [buildPrinter()];

  spyOn(printerHooks, "usePrinters").mockReturnValue({
    data: printers,
    isLoading: false,
  } as unknown as UsePrintersResult);

  spyOn(printerHooks, "useCreatePrinter").mockReturnValue({
    isPending: false,
    mutateAsync: mock().mockResolvedValue(undefined),
  } as unknown as UseCreatePrinterResult);

  spyOn(printerHooks, "useUpdatePrinter").mockReturnValue({
    isPending: false,
    mutateAsync: opts.updateMutate ?? mock().mockResolvedValue(undefined),
  } as unknown as UseUpdatePrinterResult);

  spyOn(printerHooks, "useArchivePrinter").mockReturnValue({
    isPending: false,
    mutateAsync: opts.archiveMutate ?? mock().mockResolvedValue(undefined),
  } as unknown as UseArchivePrinterResult);

  spyOn(settingsStore, "useSettingsStore").mockReturnValue({
    comandaHeaderText: null,
    updateComandaHeaderText: mock().mockResolvedValue({ isOk: () => true, isErr: () => false }),
    isLoading: false,
  } as any);

  spyOn(testPrinterModule, "testPrinter").mockResolvedValue(undefined);
}

function renderPanel() {
  return renderWithProviders(<PrinterSettingsPanel />);
}

describe("PrinterSettingsPanel", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("isDefault toggle", () => {
    it("renders Predeterminada checkbox when role is receipt", () => {
      mockAllHooks({
        printers: [buildPrinter({ id: "p1", name: "Caja 1", role: PRINTER_ROLE.RECEIPT, isDefault: false })],
      });

      renderPanel();

      expect(screen.getByRole("checkbox", { name: /predeterminada/i })).toBeInTheDocument();
    });

    it("does NOT render Predeterminada checkbox when role is comanda", () => {
      mockAllHooks({
        printers: [buildPrinter({ id: "p2", name: "Cocina 1", role: PRINTER_ROLE.COMANDA, isDefault: false })],
      });

      renderPanel();

      expect(screen.queryByRole("checkbox", { name: /predeterminada/i })).not.toBeInTheDocument();
    });

    it("includes isDefault:true in the update payload when toggled and saved", async () => {
      const updateMutate = mock().mockResolvedValue(undefined);
      mockAllHooks({
        printers: [buildPrinter({ id: "p1", name: "Caja 1", role: PRINTER_ROLE.RECEIPT, isDefault: false })],
        updateMutate,
      });

      renderPanel();

      const checkbox = screen.getByRole("checkbox", { name: /predeterminada/i });
      fireEvent.click(checkbox);

      const saveButton = screen.getByRole("button", { name: /guardar cambios/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "p1",
            input: expect.objectContaining({ isDefault: true }),
          }),
        );
      });
    });
  });

  describe("i18n", () => {
    it("renders translated title", () => {
      mockAllHooks({ printers: [] });

      renderPanel();

      expect(screen.getByRole("heading", { name: /impresoras/i })).toBeInTheDocument();
    });
  });

  describe("USB scan", () => {
    function buildUsbPrinter(overrides: Partial<Printer> = {}) {
      return buildPrinter({
        id: "p-usb",
        name: "Caja USB",
        role: PRINTER_ROLE.RECEIPT,
        type: PRINTER_TYPE.USB,
        address: "",
        ...overrides,
      });
    }

    it("does NOT render the USB scan button when type is network", () => {
      mockAllHooks({ printers: [buildPrinter({ type: PRINTER_TYPE.NETWORK })] });

      renderPanel();

      expect(
        screen.queryByRole("button", { name: /buscar impresoras usb/i }),
      ).not.toBeInTheDocument();
    });

    it("renders the USB scan button after changing the type select to USB", () => {
      mockAllHooks({ printers: [] });

      renderPanel();

      fireEvent.click(screen.getByRole("combobox", { name: /tipo de conexión/i }));
      fireEvent.click(screen.getByRole("option", { name: "USB" }));

      expect(screen.getByRole("button", { name: /buscar impresoras usb/i })).toBeInTheDocument();
    });

    it("auto-fills the address when exactly one USB printer is detected", async () => {
      mockAllHooks({ printers: [buildUsbPrinter()] });
      spyOn(usbAdapterModule, "listUsbPrinters").mockResolvedValue([
        { vid: 0x04b8, pid: 0x0e15, name: "Epson TM-T20", address: "04B8:0E15" },
      ]);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /buscar impresoras usb/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/^dirección$/i)).toHaveValue("04B8:0E15");
      });
    });

    it("shows a selector with all detected printers and updates the address on selection", async () => {
      mockAllHooks({ printers: [buildUsbPrinter()] });
      spyOn(usbAdapterModule, "listUsbPrinters").mockResolvedValue([
        { vid: 0x04b8, pid: 0x0e15, name: "Epson TM-T20", address: "04B8:0E15" },
        { vid: 0x0519, pid: 0x0003, name: "Star TSP100", address: "0519:0003" },
      ]);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /buscar impresoras usb/i }));

      const usbSelectTrigger = await screen.findByLabelText(/selecciona la impresora detectada/i);
      fireEvent.click(usbSelectTrigger);
      fireEvent.click(screen.getByRole("option", { name: /star tsp100/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/^dirección$/i)).toHaveValue("0519:0003");
      });
    });

    it("shows feedback when no USB printers are detected", async () => {
      mockAllHooks({ printers: [buildUsbPrinter()] });
      spyOn(usbAdapterModule, "listUsbPrinters").mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toastInfoSpy = spyOn(toast, "info").mockImplementation((() => "") as any);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /buscar impresoras usb/i }));

      await waitFor(() => {
        expect(toastInfoSpy).toHaveBeenCalled();
      });
    });

    it("shows feedback when the USB scan fails", async () => {
      mockAllHooks({ printers: [buildUsbPrinter()] });
      spyOn(usbAdapterModule, "listUsbPrinters").mockRejectedValue(new Error("boom"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toastErrorSpy = spyOn(toast, "error").mockImplementation((() => "") as any);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /buscar impresoras usb/i }));

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalled();
      });
    });

    it("renders the USB scan button after changing the type select to Etiqueta (label)", () => {
      mockAllHooks({ printers: [] });

      renderPanel();

      fireEvent.click(screen.getByRole("combobox", { name: /tipo de conexión/i }));
      fireEvent.click(screen.getByRole("option", { name: "Etiqueta" }));

      expect(screen.getByRole("button", { name: /buscar impresoras usb/i })).toBeInTheDocument();
    });
  });
});
