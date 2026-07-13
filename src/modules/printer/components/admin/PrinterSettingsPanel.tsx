import { Plus, Printer as PrinterIcon, Save, Trash2, Wifi, Usb, Play, CheckCircle2, AlertCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import { PRINTER_ROLE, PRINTER_TYPE, type Printer, type PrinterCreateInput, type PrinterRole, type PrinterType } from "@/modules/printer/domain/printer";
import {
  useArchivePrinter,
  useCreatePrinter,
  usePrinters,
  useUpdatePrinter,
} from "@/modules/printer/hooks/use-printers";
import { testPrinter } from "@/modules/printer/adapters/test-printer.adapter";
import { useSettingsStore } from "@/modules/settings/store/settings-store";

const PRINTER_TYPE_OPTIONS = [
  { value: PRINTER_TYPE.NETWORK, label: "Red (TCP)", icon: Wifi },
  { value: PRINTER_TYPE.USB, label: "USB", icon: Usb },
];

const PRINTER_ROLE_OPTIONS = [
  { value: PRINTER_ROLE.RECEIPT, label: "Caja (ticket)" },
  { value: PRINTER_ROLE.KITCHEN, label: "Cocina" },
  { value: PRINTER_ROLE.BAR, label: "Barra" },
  { value: PRINTER_ROLE.OTHER, label: "Otro" },
];

const PRINTER_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type PrinterFormMode = (typeof PRINTER_FORM_MODE)[keyof typeof PRINTER_FORM_MODE];

interface PrinterFormState {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
}

function buildEmptyFormState(): PrinterFormState {
  return {
    name: "",
    type: PRINTER_TYPE.NETWORK,
    address: "",
    role: PRINTER_ROLE.KITCHEN,
  };
}

function buildFormStateFromPrinter(printer: Printer): PrinterFormState {
  return {
    name: printer.name,
    type: printer.type,
    address: printer.address,
    role: printer.role,
  };
}

function toPrinterPayload(formState: PrinterFormState): PrinterCreateInput | null {
  const name = formState.name.trim();
  const address = formState.address.trim();

  if (name.length === 0 || address.length === 0) {
    return null;
  }

  return {
    name,
    type: formState.type,
    address,
    role: formState.role,
  };
}

function getStatusConfig(address: string): {
  color: string;
  bg: string;
  icon: typeof CheckCircle2;
  label: string;
} {
  if (address.trim() === "") {
    return {
      color: "text-warning",
      bg: "bg-warning/10",
      icon: AlertCircle,
      label: "Falta dirección",
    };
  }

  return {
    color: "text-success",
    bg: "bg-success/10",
    icon: CheckCircle2,
    label: "Configurada",
  };
}

function ComandaHeaderTextCard() {
  const { comandaHeaderText, updateComandaHeaderText, isLoading } = useSettingsStore();

  const [text, setText] = useState(comandaHeaderText ?? "");

  const hasChanges = text !== (comandaHeaderText ?? "");

  const handleSave = async () => {
    const result = await updateComandaHeaderText(text.trim() || null);
    result.match(
      () => {
        toast.success("Encabezado de comanda guardado");
      },
      () => toast.error("Error al guardar el encabezado de comanda"),
    );
  };

  return (
    <section className="border-b border-border-strong pb-3">
      <FormField label="Texto de la comanda" htmlFor="comanda-header-text">
        <Input
          id="comanda-header-text"
          value={text}
          onInput={(event) => setText(event.currentTarget.value)}
          placeholder="COMANDA"
        />
      </FormField>
      <p className="mt-1.5 text-2xs text-text-muted">
        Texto que aparece en el encabezado de cada etiqueta de comanda. Si se deja vacío, se usa "COMANDA" por defecto.
      </p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-2xs text-primary">{hasChanges ? "Cambios sin guardar" : ""}</span>
        <Button
          type="button"
          variant="default"
          size="small"
          onClick={() => void handleSave()}
          disabled={isLoading || !hasChanges}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar
        </Button>
      </div>
    </section>
  );
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-200",
    isActive
      ? "border-primary bg-primary/10 text-primary-strong"
      : "border-transparent text-text hover:border-border-strong hover:bg-surface-sunken/50",
  ].join(" ");
}

export function PrinterSettingsPanel() {
  const { data: printers = [] } = usePrinters();
  const createPrinterMutation = useCreatePrinter();
  const updatePrinterMutation = useUpdatePrinter();
  const archivePrinterMutation = useArchivePrinter();

  const initialPrinter = printers[0] ?? null;
  const [mode, setMode] = useState<PrinterFormMode>(
    initialPrinter ? PRINTER_FORM_MODE.EDIT : PRINTER_FORM_MODE.CREATE,
  );
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(initialPrinter?.id ?? null);
  const [formState, setFormState] = useState<PrinterFormState>(() =>
    initialPrinter ? buildFormStateFromPrinter(initialPrinter) : buildEmptyFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Printer | null>(null);

  const isSaving = createPrinterMutation.isPending || updatePrinterMutation.isPending;
  const isArchivePending = archivePrinterMutation.isPending;

  const beginCreate = () => {
    setMode(PRINTER_FORM_MODE.CREATE);
    setSelectedPrinterId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
  };

  const beginEdit = (printer: Printer) => {
    setMode(PRINTER_FORM_MODE.EDIT);
    setSelectedPrinterId(printer.id);
    setFormError(null);
    setFormState(buildFormStateFromPrinter(printer));
  };

  const handleArchive = (printer: Printer) => {
    setArchiveTarget(printer);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archivePrinterMutation.mutateAsync(archiveTarget.id);
      if (selectedPrinterId === archiveTarget.id) {
        beginCreate();
      }
      setArchiveTarget(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo archivar la impresora");
      setArchiveTarget(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toPrinterPayload(formState);
    if (!payload) {
      setFormError("Completá nombre y dirección.");
      return;
    }

    if (mode === PRINTER_FORM_MODE.EDIT && !selectedPrinterId) {
      setFormError("Seleccioná una impresora.");
      return;
    }

    try {
      if (mode === PRINTER_FORM_MODE.CREATE) {
        await createPrinterMutation.mutateAsync(payload);
      } else if (selectedPrinterId) {
        await updatePrinterMutation.mutateAsync({ id: selectedPrinterId, input: payload });
      }

      beginCreate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar la impresora");
    }
  };

  const handleTest = async () => {
    try {
      await testPrinter({ printerType: formState.type, printerAddress: formState.address });
      toast.success("Impresora respondió correctamente", {
        description: "La comanda de prueba se envió exitosamente",
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });
    } catch (e) {
      toast.error("No se pudo conectar con la impresora", {
        description: e instanceof Error ? e.message : String(e),
        icon: <AlertCircle className="h-4 w-4 text-danger" />,
      });
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_auto_1fr] gap-3">
      <ComandaHeaderTextCard />

      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">Impresoras</h2>

        <Button variant="secondary" size="small" onClick={beginCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {printers.map((printer) => {
              const isActive = selectedPrinterId === printer.id && mode === PRINTER_FORM_MODE.EDIT;
              const status = getStatusConfig(printer.address);
              const StatusIcon = status.icon;

              return (
                <div key={printer.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(printer)}
                    className={getListButtonClass(isActive)}
                  >
                    <div className="flex items-center gap-2">
                      <PrinterIcon className="h-4 w-4 text-text-dim" />
                      <div className="flex flex-col">
                        <p className="text-xs font-medium">{printer.name}</p>
                        <p className="font-mono-tabular mt-1 line-clamp-1 text-2xs text-text-dim">
                          {printer.address}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 ${status.bg}`}
                    >
                      <StatusIcon className={`h-3 w-3 ${status.color}`} />
                      <span className={`text-2xs font-medium uppercase ${status.color}`}>{status.label}</span>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isArchivePending) return;
                      handleArchive(printer);
                    }}
                    className="h-auto min-h-[60px] w-8 rounded-card text-text-dim hover:bg-surface-sunken hover:text-danger"
                    aria-label={`Archivar ${printer.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {printers.length === 0 ? <EmptyState>Sin impresoras.</EmptyState> : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === PRINTER_FORM_MODE.CREATE ? "Nueva impresora" : "Editar impresora"}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label="Nombre" htmlFor="printer-name">
              <Input
                id="printer-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
                placeholder="Cocina"
              />
            </FormField>

            <FormField label="Rol" htmlFor="printer-role">
              <Select
                value={formState.role}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, role: value as PrinterRole }))
                }
              >
                <SelectTrigger id="printer-role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {PRINTER_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Tipo de conexión" htmlFor="printer-type">
              <Select
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, type: value as PrinterType, address: "" }))
                }
              >
                <SelectTrigger id="printer-type">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PRINTER_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-text-dim" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid gap-1.5">
              <Label htmlFor="printer-address">Dirección</Label>
              <div className="relative">
                <Input
                  id="printer-address"
                  value={formState.address}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((previous) => ({ ...previous, address: value }));
                  }}
                  placeholder={formState.type === "network" ? "192.168.1.100:9100" : "04b8:0e15"}
                  className="pr-20 font-mono-tabular text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-medium uppercase tracking-wider text-text-muted">
                  {formState.type === "network" ? "IP:PORT" : "VID:PID"}
                </span>
              </div>
              <p className="text-2xs text-text-muted leading-relaxed">
                {formState.type === "network"
                  ? "Ingresa la dirección IP y el puerto TCP separados por dos puntos. Puerto estándar ESC/POS: 9100."
                  : "Ingresa el identificador USB en formato VID:PID (hexadecimal)."}
              </p>
            </div>

            <FormError message={formError} />

            <div className="flex items-center justify-end gap-2 border-t border-border pt-2.5">
              {mode === PRINTER_FORM_MODE.EDIT && (
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => void handleTest()}
                  disabled={isSaving || formState.address.trim() === ""}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Probar
                </Button>
              )}
              <Button type="submit" variant="default" size="small" disabled={isSaving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {mode === PRINTER_FORM_MODE.CREATE ? "Crear impresora" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title="Archivar impresora"
        description={
          archiveTarget
            ? `¿Archivar ${archiveTarget.name}? Las categorías que la usen quedarán sin impresora asignada.`
            : ""
        }
        confirmLabel="Archivar"
        confirmVariant="danger"
        isLoading={isArchivePending}
        onConfirm={() => void handleConfirmArchive()}
      />
    </div>
  );
}
