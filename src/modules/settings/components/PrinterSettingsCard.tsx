import { useState, useCallback } from "react";
import {
  Printer,
  Usb,
  Wifi,
  CircleOff,
  Save,
  Play,
  CheckCircle2,
  AlertCircle,
  Scan,
} from "lucide-react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
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
  {
    value: "none",
    label: "Sin impresora",
    description: "No imprimir tickets",
    icon: CircleOff,
  },
  {
    value: "usb",
    label: "USB",
    description: "Detección automática",
    icon: Usb,
  },
  {
    value: "network",
    label: "Red (TCP)",
    description: "Conexión por red local",
    icon: Wifi,
  },
];

function getStatusConfig(
  type: string,
  address: string | null,
): {
  color: string;
  bg: string;
  icon: typeof CheckCircle2;
  label: string;
} {
  if (type === "none" || !type) {
    return {
      color: "text-ink-muted",
      bg: "bg-obsidian",
      icon: CircleOff,
      label: "No configurada",
    };
  }
  if (!address || address.trim() === "") {
    return {
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      icon: AlertCircle,
      label: "Falta dirección",
    };
  }
  return {
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    icon: CheckCircle2,
    label: "Configurada",
  };
}

export function PrinterSettingsCard() {
  const {
    printerType: currentType,
    printerAddress: currentAddress,
    updatePrinterSettings,
    isLoading,
  } = useSettingsStore();

  const [printerType, setPrinterType] = useState(currentType);
  const [printerAddress, setPrinterAddress] = useState(
    currentAddress ?? "",
  );
  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const status = getStatusConfig(printerType, printerAddress);
  const StatusIcon = status.icon;

  const hasChanges =
    printerType !== currentType || printerAddress !== (currentAddress ?? "");

  const isTestable =
    printerType !== "none" && printerAddress.trim() !== "";

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
        // Auto-seleccionar si solo hay una
        setPrinterAddress(detected[0].address);
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
  }, []);

  const handleSave = async () => {
    const result = await updatePrinterSettings(
      printerType,
      printerType === "none" ? null : printerAddress || null,
    );
    result.match(
      () => {
        toast.success("Configuración guardada", {
          description:
            printerType === "none"
              ? "Impresora desactivada"
              : `Impresora ${printerType.toUpperCase()} configurada`,
        });
      },
      () => toast.error("Error al guardar configuración de impresora"),
    );
  };

  const handleTest = async () => {
    try {
      await testPrinter();
      toast.success("Impresora respondió correctamente", {
        description: "El ticket de prueba se envió exitosamente",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });
    } catch (e) {
      toast.error("No se pudo conectar con la impresora", {
        description: e instanceof Error ? e.message : String(e),
        icon: <AlertCircle className="h-4 w-4 text-danger" />,
      });
    }
  };

  return (
    <div className="rounded-card border border-hairline bg-obsidian-raised overflow-hidden">
      {/* Header con status */}
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sharp bg-surface1">
            <Printer className="h-4 w-4 text-champagne" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
              Impresora térmica
            </h3>
            <p className="text-[11px] text-ink-dim">ESC/POS — tickets automáticos</p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${status.bg}`}
        >
          <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
          <span className={`text-[10px] font-medium uppercase tracking-wider ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-5 p-5">
        {/* Tipo de conexión */}
        <div className="grid gap-1.5">
          <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
            Tipo de conexión
          </Label>
          <Select value={printerType} onValueChange={(v) => {
            const newType = v as "none" | "usb" | "network";
            setPrinterType(newType);
            if (newType === "usb") {
              setPrinterAddress("");
              setUsbPrinters([]);
            }
          }}>
            <SelectTrigger data-testid="printer-type-select">
              <span className="text-ink">{PRINTER_OPTIONS.find((o) => o.value === printerType)?.label}</span>
            </SelectTrigger>
            <SelectContent>
              {PRINTER_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-ink-dim" />
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-[10px] text-ink-muted">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* USB: escanear o seleccionar */}
        {printerType === "usb" && (
          <div className="grid gap-1.5 animate-fade-in">
            {usbPrinters.length === 0 ? (
              <>
                <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                  Detección automática
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={handleScanUsb}
                    disabled={isScanning}
                    className="gap-1.5"
                  >
                    <Scan className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                    {isScanning ? "Escaneando..." : "Buscar impresoras USB"}
                  </Button>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Conecta tu impresora térmica por USB y haz clic en "Buscar". El sistema detectará automáticamente el modelo.
                </p>
              </>
            ) : (
              <>
                <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                  Impresoras detectadas
                </Label>
                <Select
                  value={printerAddress}
                  onValueChange={setPrinterAddress}
                >
                  <SelectTrigger>
                    <span className="text-ink truncate">
                      {printerAddress
                        ? usbPrinters.find((p) => p.address === printerAddress)?.name ?? printerAddress
                        : "Seleccionar impresora..."}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {usbPrinters.map((printer) => (
                      <SelectItem key={printer.address} value={printer.address}>
                        <div className="flex flex-col">
                          <span className="text-ink">{printer.name}</span>
                          <span className="text-[10px] text-ink-muted font-mono">
                            {printer.address}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={handleScanUsb}
                    disabled={isScanning}
                    className="gap-1.5 text-[11px]"
                  >
                    <Scan className={`h-3 w-3 ${isScanning ? "animate-spin" : ""}`} />
                    {isScanning ? "Escaneando..." : "Volver a buscar"}
                  </Button>
                </div>
              </>
            )}

            {/* Info card USB */}
            <div className="flex items-start gap-2 rounded-sharp bg-surface1/50 p-3 border border-hairline">
              <Usb className="h-4 w-4 text-champagne shrink-0 mt-0.5" />
              <div className="grid gap-0.5">
                <span className="text-[11px] font-medium text-ink">Conexión USB directa</span>
                <span className="text-[10px] text-ink-dim leading-relaxed">
                  El sistema se comunica directamente con la impresora sin drivers del sistema operativo. Asegúrate de que la impresora esté conectada y encendida.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Network: input manual */}
        {printerType === "network" && (
          <div className="grid gap-1.5 animate-fade-in">
            <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              Dirección del dispositivo
            </Label>
            <div className="relative">
              <Input
                data-testid="printer-address-input"
                value={printerAddress}
                onChange={(e) => setPrinterAddress(e.target.value)}
                placeholder="192.168.1.100:9100"
                className="pr-20 font-mono text-[13px]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wider text-ink-muted">
                IP:PORT
              </span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Ingresa la dirección IP y el puerto TCP separados por dos puntos. Puerto estándar ESC/POS: 9100.
            </p>

            <div className="flex items-start gap-2 rounded-sharp bg-surface1/50 p-3 border border-hairline">
              <Wifi className="h-4 w-4 text-champagne shrink-0 mt-0.5" />
              <div className="grid gap-0.5">
                <span className="text-[11px] font-medium text-ink">Conexión por red local</span>
                <span className="text-[10px] text-ink-dim leading-relaxed">
                  La impresora debe estar en la misma red local con IP estática o asignada por DHCP. Puerto estándar: 9100.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[11px] text-champagne">Cambios sin guardar</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={handleTest}
              disabled={isLoading || !isTestable}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Probar
            </Button>
            <Button
              type="button"
              variant="default"
              size="small"
              onClick={handleSave}
              disabled={isLoading}
              className="rounded-card bg-champagne text-obsidian hover:bg-champagne/90 gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
