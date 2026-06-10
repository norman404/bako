import { ColorInput } from "@/shared/components/ColorInput";
import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { DeliveryPerson } from "@/modules/delivery/domain/delivery-person";
import type { DeliveryPersonCreateInput } from "@/modules/delivery/domain/ports";
import {
  useArchiveDeliveryPerson,
  useCreateDeliveryPerson,
  useDeliveryPersons,
  useUpdateDeliveryPerson,
} from "@/modules/delivery/hooks/use-delivery-persons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

const DELIVERY_PERSON_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type DeliveryPersonFormMode = (typeof DELIVERY_PERSON_FORM_MODE)[keyof typeof DELIVERY_PERSON_FORM_MODE];

interface DeliveryPersonFormState {
  name: string;
  color: string;
  phone: string;
}

function buildEmptyFormState(): DeliveryPersonFormState {
  return {
    name: "",
    color: "",
    phone: "",
  };
}

function buildFormStateFromPerson(person: DeliveryPerson): DeliveryPersonFormState {
  return {
    name: person.name,
    color: person.color,
    phone: person.phone ?? "",
  };
}

function toDeliveryPersonPayload(formState: DeliveryPersonFormState): DeliveryPersonCreateInput | null {
  const name = formState.name.trim();
  if (name.length === 0) {
    return null;
  }

  return {
    name,
    color: formState.color.trim(),
    phone: formState.phone.trim() || null,
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-200",
    isActive
      ? "border-primary bg-primary/10 text-primary-strong"
      : "border-transparent text-text hover:border-border-strong hover:bg-surface-sunken/50",
  ].join(" ");
}

function DeliveryPersonSettingsPanel() {
  const { t } = useTranslation("delivery");
  const { data: deliveryPersons = [] } = useDeliveryPersons();

  const createMutation = useCreateDeliveryPerson();
  const updateMutation = useUpdateDeliveryPerson();
  const archiveMutation = useArchiveDeliveryPerson();

  const initialPerson = deliveryPersons[0] ?? null;
  const [mode, setMode] = useState<DeliveryPersonFormMode>(
    initialPerson ? DELIVERY_PERSON_FORM_MODE.EDIT : DELIVERY_PERSON_FORM_MODE.CREATE,
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(initialPerson?.id ?? null);
  const [formState, setFormState] = useState<DeliveryPersonFormState>(() =>
    initialPerson ? buildFormStateFromPerson(initialPerson) : buildEmptyFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isArchivePending = archiveMutation.isPending;

  const beginCreate = () => {
    setMode(DELIVERY_PERSON_FORM_MODE.CREATE);
    setSelectedPersonId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
  };

  const beginEdit = (person: DeliveryPerson) => {
    setMode(DELIVERY_PERSON_FORM_MODE.EDIT);
    setSelectedPersonId(person.id);
    setFormError(null);
    setFormState(buildFormStateFromPerson(person));
  };

  const handleArchive = async (person: DeliveryPerson) => {
    const shouldArchive = window.confirm(t("form.archiveConfirm", { name: person.name }));
    if (!shouldArchive) {
      return;
    }

    try {
      await archiveMutation.mutateAsync(person.id);
      if (selectedPersonId === person.id) {
        beginCreate();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("form.archiveError"));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toDeliveryPersonPayload(formState);
    if (!payload) {
      setFormError(t("form.validation.nameRequired"));
      return;
    }

    if (mode === DELIVERY_PERSON_FORM_MODE.EDIT && !selectedPersonId) {
      setFormError(t("form.validation.genericError"));
      return;
    }

    try {
      if (mode === DELIVERY_PERSON_FORM_MODE.CREATE) {
        await createMutation.mutateAsync(payload);
      } else if (selectedPersonId) {
        await updateMutation.mutateAsync({ id: selectedPersonId, input: payload });
      }

      beginCreate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("form.validation.genericError"));
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">
          {t("panel.title")}
        </h2>

        <Button variant="secondary" size="small" onClick={beginCreate}>
          <Plus className="h-3.5 w-3.5" />
          {t("panel.new")}
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {deliveryPersons.map((person) => {
              const isActive = selectedPersonId === person.id && mode === DELIVERY_PERSON_FORM_MODE.EDIT;

              return (
                <div key={person.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(person)}
                    className={getListButtonClass(isActive)}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: person.color }}
                      />
                      <p className="text-xs font-medium">{person.name}</p>
                    </span>
                    {person.phone ? (
                      <p className="mt-1 line-clamp-1 text-2xs text-text-dim">{person.phone}</p>
                    ) : null}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      void handleArchive(person);
                    }}
                    className="h-auto min-h-[60px] w-8 rounded-card text-text-dim hover:bg-surface-sunken hover:text-danger"
                    aria-label={`Archivar ${person.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {deliveryPersons.length === 0 ? (
              <EmptyState>{t("panel.empty")}</EmptyState>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === DELIVERY_PERSON_FORM_MODE.CREATE
                ? t("panel.createTitle")
                : t("panel.editTitle")}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label={t("form.name")} htmlFor="delivery-person-name">
              <Input
                id="delivery-person-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
                placeholder={t("form.namePlaceholder")}
              />
            </FormField>

            <ColorInput
              id="delivery-person-color"
              value={formState.color}
              onChange={(value) =>
                setFormState((previous) => ({ ...previous, color: value }))
              }
              label={t("form.color")}
              placeholder={t("form.colorPlaceholder")}
            />

            <FormField label={t("form.phone")} htmlFor="delivery-person-phone">
              <Input
                id="delivery-person-phone"
                value={formState.phone}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, phone: value }));
                }}
                placeholder={t("form.phonePlaceholder")}
              />
            </FormField>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-border pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                disabled={isSaving}
              >
                {mode === DELIVERY_PERSON_FORM_MODE.CREATE ? t("form.create") : t("form.save")}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { DELIVERY_PERSON_FORM_MODE, DeliveryPersonSettingsPanel };
