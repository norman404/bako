import { useState, useCallback } from "react";
import {
  Usb,
  Wifi,
  CircleOff,
  Play,
  Scan,
} from "lucide-react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { testPrinter } from "@/modules/checkout/adapters/print-ticket.adapter";

interface UsbPrinterInfo {
  vid: number;
  pid: number;
  name: string;
  address: string;
}

const PRINTER_OPTIONS = [
  { value: "none", label: "Sin impresora", description: "No imprimir tickets", icon: CircleOff },
  { value: "usb", label: "USB", description: "Detección automática", icon: Usb },
  { value: "network", label: "Red (TCP)", description: "Conexión por red local", icon: Wifi },
];

export function PrinterSettingsCard() {
  const {
    printerType: currentType,
    printerAddress: currentAddress,
    updatePrinterSettings,
    isLoading,
  } = useSettingsStore();

  const [printerType, setPrinterType] = useState(currentType);
  const [printerAddress, setPrinterAddress] = useState(currentAddress ?? "");
  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const isTestable = printerType !== "none" && printerAddress.trim() !== "";

  async function savePrinterSettings(type: string, address: string | null) {
    const result = await updatePrinterSettings(
      type as "none" | "usb" | "network",
      type === "none" ? null : address || null,
    );
    result.match(
      () => {
        toast.success("Configuración guardada", {
          description:
            type === "none"
              ? "Impresora desactivada"
              : `Impresora ${type.toUpperCase()} configurada`,
        });
      },
      () => toast.error("Error al guardar configuración de impresora"),
    );
  }

  function handleTypeChange(v: string) {
    const newType = v as "none" | "usb" | "network";
    setPrinterType(newType);
    if (newType === "usb") {
      setPrinterAddress("");
      setUsbPrinters([]);
    }
    // Auto-save on type change
    savePrinterSettings(newType, newType === "none" ? null : newType === "usb" ? "" : printerAddress);
  }

  function handleAddressBlur() {
    if (printerAddress !== (currentAddress ?? "")) {
      savePrinterSettings(printerType, printerAddress || null);
    }
  }

  function handleUsbPrinterSelect(address: string) {
    setPrinterAddress(address);
    savePrinterSettings(printerType, address);
  }

  const handleScanUsb = useCallback(async () => {
    setIsScanning(true);
    try {
      const detected: UsbPrinterInfo[] = await invoke("list_usb_printers");
      setUsbPrinters(detected);

      if (detected.length === 0) {
        toast.info("No se detectaron impresoras USB", {
          description: "Conecta una impresora térmica y vuelve a escanear.",
        });
      } else if (detected.length === 1) {
        setPrinterAddress(detected[0].address);
        savePrinterSettings(printerType, detected[0].address);
        toast.success("Impresora detectada", {
          description: `${detected[0].name} (${detected[0].address})`,
        });
      } else {
        toast.success(`${detected.length} impresoras detectadas`, {
          description: "Selecciona una del listado",
        });
      }
    } catch (e) {
      toast.error("Error escaneando USB", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsScanning(false);
    }
  }, [printerType]);

  const handleTest = async () => {
    try {
      await testPrinter();
      toast.success("Impresora respondió correctamente", {
        description: "El ticket de prueba se envió exitosamente",
      });
    } catch (e) {
      toast.error("No se pudo conectar con la impresora", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div>
      {/* Connection type row */}
      <div className="px-5">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label className="text-sm font-medium text-text">
            Tipo de conexión
          </label>
          <Select value={printerType} onValueChange={handleTypeChange}>
            <SelectTrigger data-testid="printer-type-select" className="w-[220px]">
              <span className="text-text">
                {PRINTER_OPTIONS.find((o) => o.value === printerType)?.label}
              </span>
            </SelectTrigger>
            <SelectContent>
              {PRINTER_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-text-dim" />
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-2xs text-text-muted">{option.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* USB section */}
      {printerType === "usb" && (
        <div className="px-5">
          <div className="py-3 border-b border-border">
          {usbPrinters.length === 0 ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-text">
                Detección automática
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={handleScanUsb}
                  disabled={isScanning}
                >
                  <Scan className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Escaneando..." : "Buscar impresoras USB"}
                </Button>
              </div>
              <p className="text-xs text-text-dim">
                Conecta tu impresora térmica por USB y haz clic en "Buscar".
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-text">
                Impresoras detectadas
              </label>
              <Select value={printerAddress} onValueChange={handleUsbPrinterSelect}>
                <SelectTrigger className="w-full">
                  <span className="text-text truncate">
                    {printerAddress
                      ? usbPrinters.find((p) => p.address === printerAddress)?.name ?? printerAddress
                      : "Seleccionar impresora..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {usbPrinters.map((printer) => (
                    <SelectItem key={printer.address} value={printer.address}>
                      <div className="flex flex-col">
                        <span className="text-text">{printer.name}</span>
                        <span className="font-mono-tabular text-2xs text-text-muted">
                          {printer.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={handleScanUsb}
                disabled={isScanning}
                className="w-fit text-xs"
              >
                <Scan className={`h-3 w-3 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Escaneando..." : "Volver a buscar"}
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Network section */}
      {printerType === "network" && (
        <div className="px-5">
          <div className="py-3 border-b border-border">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text">
              Dirección del dispositivo
            </label>
            <div className="relative">
              <Input
                data-testid="printer-address-input"
                value={printerAddress}
                onChange={(e) => setPrinterAddress(e.target.value)}
                onBlur={handleAddressBlur}
                placeholder="192.168.1.100:9100"
                className="pr-20 font-mono-tabular text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-medium uppercase tracking-wider text-text-muted">
                IP:PORT
              </span>
            </div>
            <p className="text-xs text-text-dim">
              Ingresa la dirección IP y el puerto TCP. Puerto estándar ESC/POS: 9100.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Test button */}
      <div className="px-5">
        <div className="flex items-center justify-end py-3">
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={handleTest}
          disabled={isLoading || !isTestable}
        >
          <Play className="h-3.5 w-3.5" />
          Probar
        </Button>
        </div>
      </div>
    </div>
  );
}
