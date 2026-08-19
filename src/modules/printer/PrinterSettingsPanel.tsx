import { Plus, Printer as PrinterIcon, Save, Trash2, Wifi, Usb, Tag, Play, CheckCircle2, AlertCircle, Scan } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  listSettingsWindowUsbPrinters,
  requestSettingsOperation,
  SETTINGS_RPC_OPERATION,
  testSettingsWindowPrinter,
  useArchiveSettingsWindowPrinter,
  useCreateSettingsWindowPrinter,
  useSettingsWindowPrinters,
  useSettingsWindowStore,
  useUpdateSettingsWindowPrinter,
  type SettingsPrinterDto,
  type SettingsPrinterInput,
  type SettingsUsbPrinterDto,
} from "@/modules/settings/settings-window-entry";

import {
  PRINTER_LABEL_LANGUAGE,
  PRINTER_ROLE,
  PRINTER_TYPE,
  type LabelLanguage,
  type PrinterRole,
  type PrinterType,
} from "./printer";
import { translatePrinterError } from "./translate-printer-error";

const LABEL_LANGUAGE_OPTIONS = [
  { value: PRINTER_LABEL_LANGUAGE.TSPL, label: "TSPL" },
  { value: PRINTER_LABEL_LANGUAGE.ZPL, label: "ZPL" },
  { value: PRINTER_LABEL_LANGUAGE.EPL, label: "EPL" },
  { value: PRINTER_LABEL_LANGUAGE.CPCL, label: "CPCL" },
];

const PRINTER_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type PrinterFormMode = (typeof PRINTER_FORM_MODE)[keyof typeof PRINTER_FORM_MODE];

const DEFAULT_LABEL_WIDTH_MM = 40;
const DEFAULT_LABEL_HEIGHT_MM = 30;
const DEFAULT_LABEL_GAP_MM = 2;
const DEFAULT_LABEL_LANGUAGE = PRINTER_LABEL_LANGUAGE.TSPL;

interface PrinterFormState {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  isDefault: boolean;
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
  labelLanguage: LabelLanguage;
}

function buildEmptyFormState(): PrinterFormState {
  return {
    name: "",
    type: PRINTER_TYPE.NETWORK,
    address: "",
    role: PRINTER_ROLE.COMANDA,
    isDefault: false,
    labelWidthMm: DEFAULT_LABEL_WIDTH_MM,
    labelHeightMm: DEFAULT_LABEL_HEIGHT_MM,
    labelGapMm: DEFAULT_LABEL_GAP_MM,
    labelLanguage: DEFAULT_LABEL_LANGUAGE,
  };
}

function buildFormStateFromPrinter(printer: SettingsPrinterDto): PrinterFormState {
  return {
    name: printer.name,
    type: printer.type,
    address: printer.address,
    role: printer.role,
    isDefault: printer.isDefault,
    labelWidthMm: printer.labelWidthMm,
    labelHeightMm: printer.labelHeightMm,
    labelGapMm: printer.labelGapMm,
    labelLanguage: printer.labelLanguage,
  };
}

function toPrinterPayload(formState: PrinterFormState): SettingsPrinterInput | null {
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
    isDefault: formState.isDefault,
    labelWidthMm: formState.labelWidthMm,
    labelHeightMm: formState.labelHeightMm,
    labelGapMm: formState.labelGapMm,
    labelLanguage: formState.labelLanguage,
  };
}

function getStatusConfig(address: string, t: (key: string) => string): {
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
      label: t("settings:printer.statusMissingAddress"),
    };
  }

  return {
    color: "text-success",
    bg: "bg-success/10",
    icon: CheckCircle2,
    label: t("settings:printer.statusConfigured"),
  };
}

function ComandaHeaderTextCard() {
  const { t } = useTranslation(["settings", "errors"]);
  const comandaHeaderText = useSettingsWindowStore(
    (state) => state.snapshot?.comandaHeaderText,
  );
  const [text, setText] = useState(comandaHeaderText ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = text !== (comandaHeaderText ?? "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await requestSettingsOperation(
        SETTINGS_RPC_OPERATION.UPDATE_COMANDA_HEADER,
        { text: text.trim() || null },
      );
      useSettingsWindowStore.getState().applySnapshot(updated);
      toast.success(t("settings:printer.comandaHeaderSaved"));
    } catch {
      toast.error(t("settings:printer.comandaHeaderError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="border-b border-border-strong pb-3">
      <FormField label={t("settings:printer.comandaHeaderTitle")} htmlFor="comanda-header-text">
        <Input
          id="comanda-header-text"
          value={text}
          onInput={(event) => setText(event.currentTarget.value)}
          placeholder={t("settings:printer.comandaHeaderPlaceholder")}
        />
      </FormField>
      <p className="mt-1.5 text-2xs text-text-muted">
        {t("settings:printer.comandaHeaderHelper")}
      </p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-2xs text-primary">{hasChanges ? t("settings:printer.comandaHeaderChangesUnsaved") : ""}</span>
        <Button
          type="button"
          variant="default"
          size="small"
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {t("settings:printer.comandaHeaderSaveButton")}
        </Button>
      </div>
    </section>
  );
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-none border-l-[3px] px-3 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-primary-strong bg-primary/15 text-primary-strong"
      : "border-transparent text-text hover:bg-surface-sunken/60",
  ].join(" ");
}

export function PrinterSettingsPanel() {
  const { t } = useTranslation(["settings", "errors"]);
  const { data: printers = [] } = useSettingsWindowPrinters();
  const createPrinterMutation = useCreateSettingsWindowPrinter();
  const updatePrinterMutation = useUpdateSettingsWindowPrinter();
  const archivePrinterMutation = useArchiveSettingsWindowPrinter();

  const printerTypeOptions = [
    { value: PRINTER_TYPE.NETWORK, label: t("settings:printer.typeNetwork"), icon: Wifi },
    { value: PRINTER_TYPE.USB, label: t("settings:printer.typeUsb"), icon: Usb },
    { value: PRINTER_TYPE.LABEL, label: t("settings:printer.typeLabelPrinter"), icon: Tag },
  ];

  const printerRoleOptions = [
    { value: PRINTER_ROLE.RECEIPT, label: t("settings:printer.roleReceipt") },
    { value: PRINTER_ROLE.COMANDA, label: t("settings:printer.roleComanda") },
  ];

  const initialPrinter = printers[0] ?? null;
  const [mode, setMode] = useState<PrinterFormMode>(
    initialPrinter ? PRINTER_FORM_MODE.EDIT : PRINTER_FORM_MODE.CREATE,
  );
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(initialPrinter?.id ?? null);
  const [formState, setFormState] = useState<PrinterFormState>(() =>
    initialPrinter ? buildFormStateFromPrinter(initialPrinter) : buildEmptyFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SettingsPrinterDto | null>(null);
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [detectedUsbPrinters, setDetectedUsbPrinters] = useState<SettingsUsbPrinterDto[]>([]);

  const isSaving = createPrinterMutation.isPending || updatePrinterMutation.isPending;
  const isArchivePending = archivePrinterMutation.isPending;

  const beginCreate = () => {
    setMode(PRINTER_FORM_MODE.CREATE);
    setSelectedPrinterId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
    setDetectedUsbPrinters([]);
  };

  const beginEdit = (printer: SettingsPrinterDto) => {
    setMode(PRINTER_FORM_MODE.EDIT);
    setSelectedPrinterId(printer.id);
    setFormError(null);
    setFormState(buildFormStateFromPrinter(printer));
    setDetectedUsbPrinters([]);
  };

  const handleArchive = (printer: SettingsPrinterDto) => {
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
      setFormError(translatePrinterError(error, t));
      setArchiveTarget(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toPrinterPayload(formState);
    if (!payload) {
      setFormError(t("settings:printer.formErrorNameAddress"));
      return;
    }

    if (mode === PRINTER_FORM_MODE.EDIT && !selectedPrinterId) {
      setFormError(t("settings:printer.formErrorSelectPrinter"));
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
      setFormError(translatePrinterError(error, t));
    }
  };

  const handleTest = async () => {
    try {
      await testSettingsWindowPrinter({
        input: {
          printerType: formState.type,
          printerAddress: formState.address,
          labelWidthMm: formState.type === PRINTER_TYPE.LABEL ? formState.labelWidthMm : undefined,
          labelHeightMm: formState.type === PRINTER_TYPE.LABEL ? formState.labelHeightMm : undefined,
          labelGapMm: formState.type === PRINTER_TYPE.LABEL ? formState.labelGapMm : undefined,
          labelLanguage: formState.type === PRINTER_TYPE.LABEL ? formState.labelLanguage : undefined,
        },
      });
      toast.success(t("settings:printer.testSuccess"), {
        description: t("settings:printer.testSuccessDesc"),
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });
    } catch (e) {
      toast.error(t("settings:printer.testError"), {
        description: translatePrinterError(e, t),
        icon: <AlertCircle className="h-4 w-4 text-danger" />,
      });
    }
  };

  const handleScanUsb = async () => {
    setIsScanningUsb(true);
    setDetectedUsbPrinters([]);
    try {
      const detected = await listSettingsWindowUsbPrinters();

      if (detected.length === 0) {
        toast.info(t("settings:printer.scanUsbNoneFound"));
      } else if (detected.length === 1) {
        const address = detected[0]!.address;
        setFormState((previous) => ({ ...previous, address }));
        toast.success(t("settings:printer.scanUsbAutoSelected"), {
          description: address,
        });
      } else {
        setDetectedUsbPrinters(detected);
      }
    } catch {
      toast.error(t("settings:printer.scanUsbError"));
    } finally {
      setIsScanningUsb(false);
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_auto_1fr] gap-3">
      <ComandaHeaderTextCard />

      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">{t("settings:printer.title")}</h2>

        <Button variant="secondary" size="small" onClick={beginCreate}>
          <Plus className="h-3.5 w-3.5" />
          {t("settings:printer.newButton")}
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden md:border-r md:border-border md:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {printers.map((printer) => {
              const isActive = selectedPrinterId === printer.id && mode === PRINTER_FORM_MODE.EDIT;
              const status = getStatusConfig(printer.address, t);
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
                    aria-label={t("settings:printer.archiveAriaLabel", { name: printer.name })}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {printers.length === 0 ? <EmptyState>{t("settings:printer.emptyState")}</EmptyState> : null}
          </div>
        </section>

        <section className="min-h-0 md:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === PRINTER_FORM_MODE.CREATE ? t("settings:printer.createTitle") : t("settings:printer.editTitle")}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label={t("settings:printer.nameLabel")} htmlFor="printer-name">
              <Input
                id="printer-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
                placeholder={t("settings:printer.namePlaceholder")}
              />
            </FormField>

            <FormField label={t("settings:printer.roleLabel")} htmlFor="printer-role">
              <Select
                value={formState.role}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, role: value as PrinterRole }))
                }
              >
                <SelectTrigger id="printer-role">
                  <SelectValue placeholder={t("settings:printer.rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {printerRoleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {formState.role === PRINTER_ROLE.RECEIPT && (
              <FormField label={t("settings:printer.defaultLabel")} htmlFor="printer-is-default">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="printer-is-default"
                    checked={formState.isDefault}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, isDefault: checked === true }))
                    }
                  />
                  <span className="text-xs text-text-muted">{t("settings:printer.defaultDescription")}</span>
                </div>
              </FormField>
            )}

            <FormField label={t("settings:printer.typeLabel")} htmlFor="printer-type">
              <Select
                value={formState.type}
                onValueChange={(value) => {
                  setFormState((previous) => ({
                    ...previous,
                    type: value as PrinterType,
                    address: "",
                    labelWidthMm: DEFAULT_LABEL_WIDTH_MM,
                    labelHeightMm: DEFAULT_LABEL_HEIGHT_MM,
                    labelGapMm: DEFAULT_LABEL_GAP_MM,
                    labelLanguage: value === PRINTER_TYPE.LABEL ? DEFAULT_LABEL_LANGUAGE : previous.labelLanguage,
                  }));
                  setDetectedUsbPrinters([]);
                }}
              >
                <SelectTrigger id="printer-type">
                  <SelectValue placeholder={t("settings:printer.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {printerTypeOptions.map((option) => {
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
              <Label htmlFor="printer-address">{t("settings:printer.addressLabel")}</Label>
              <div className="relative">
                <Input
                  id="printer-address"
                  value={formState.address}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((previous) => ({ ...previous, address: value }));
                  }}
                  placeholder={
                    formState.type === "network"
                      ? t("settings:printer.addressPlaceholderNetwork")
                      : t("settings:printer.addressPlaceholderUsb")
                  }
                  className="pr-20 font-mono-tabular text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-medium uppercase tracking-wider text-text-muted">
                  {formState.type === "network" ? "IP:PORT" : "VID:PID"}
                </span>
              </div>
              <p className="text-2xs text-text-muted leading-relaxed">
                {formState.type === "network"
                  ? t("settings:printer.addressHelperNetwork")
                  : formState.type === "usb"
                    ? t("settings:printer.addressHelperUsb")
                    : t("settings:printer.addressHelperLabel")}
              </p>

              {(formState.type === PRINTER_TYPE.USB || formState.type === PRINTER_TYPE.LABEL) && (
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => void handleScanUsb()}
                    disabled={isScanningUsb}
                    className="w-fit gap-1.5"
                  >
                    <Scan className="h-3.5 w-3.5" />
                    {isScanningUsb
                      ? t("settings:printer.scanUsbButtonScanning")
                      : t("settings:printer.scanUsbButton")}
                  </Button>

                  {detectedUsbPrinters.length > 0 && (
                    <div className="grid gap-1">
                      <Label htmlFor="printer-usb-detected" className="sr-only">
                        {t("settings:printer.scanUsbSelectPlaceholder")}
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setFormState((previous) => ({ ...previous, address: value }))
                        }
                      >
                        <SelectTrigger id="printer-usb-detected">
                          <SelectValue placeholder={t("settings:printer.scanUsbSelectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {detectedUsbPrinters.map((printer) => (
                            <SelectItem key={printer.address} value={printer.address}>
                              {printer.name} ({printer.address})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {formState.type === PRINTER_TYPE.LABEL && (
              <div className="grid grid-cols-2 gap-2">
                <FormField label={t("settings:printer.labelWidthMm")} htmlFor="printer-label-width">
                  <Input
                    id="printer-label-width"
                    type="number"
                    min={10}
                    max={200}
                    value={formState.labelWidthMm}
                    onInput={(event) => {
                      const value = Number.parseInt(event.currentTarget.value, 10) || DEFAULT_LABEL_WIDTH_MM;
                      setFormState((previous) => ({ ...previous, labelWidthMm: value }));
                    }}
                  />
                </FormField>
                <FormField label={t("settings:printer.labelHeightMm")} htmlFor="printer-label-height">
                  <Input
                    id="printer-label-height"
                    type="number"
                    min={10}
                    max={200}
                    value={formState.labelHeightMm}
                    onInput={(event) => {
                      const value = Number.parseInt(event.currentTarget.value, 10) || DEFAULT_LABEL_HEIGHT_MM;
                      setFormState((previous) => ({ ...previous, labelHeightMm: value }));
                    }}
                  />
                </FormField>
                <FormField label={t("settings:printer.labelGapMm")} htmlFor="printer-label-gap">
                  <Input
                    id="printer-label-gap"
                    type="number"
                    min={0}
                    max={50}
                    value={formState.labelGapMm}
                    onInput={(event) => {
                      const value = Number.parseInt(event.currentTarget.value, 10) || DEFAULT_LABEL_GAP_MM;
                      setFormState((previous) => ({ ...previous, labelGapMm: value }));
                    }}
                  />
                </FormField>
                <FormField label={t("settings:printer.labelLanguageLabel")} htmlFor="printer-label-language">
                  <Select
                    value={formState.labelLanguage}
                    onValueChange={(value) =>
                      setFormState((previous) => ({ ...previous, labelLanguage: value as LabelLanguage }))
                    }
                  >
                    <SelectTrigger id="printer-label-language">
                      <SelectValue placeholder={t("settings:printer.labelLanguagePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

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
                  {t("settings:printer.testButton")}
                </Button>
              )}
              <Button type="submit" variant="default" size="small" disabled={isSaving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {mode === PRINTER_FORM_MODE.CREATE ? t("settings:printer.createButton") : t("settings:printer.saveButton")}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title={t("settings:printer.archiveTitle")}
        description={
          archiveTarget
            ? t("settings:printer.archiveConfirm", { name: archiveTarget.name })
            : ""
        }
        confirmLabel={t("settings:printer.archiveButton")}
        confirmVariant="danger"
        isLoading={isArchivePending}
        onConfirm={() => void handleConfirmArchive()}
      />
    </div>
  );
}
