import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Menu } from "@/modules/menu/domain/menu";
import type { MenuCreateInput } from "@/modules/menu/domain/ports";
import {
  useCreateMenu,
  useUpdateMenu,
  useDeleteMenu,
} from "@/modules/menu/hooks/use-menus";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";

const MENU_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type MenuFormMode = (typeof MENU_FORM_MODE)[keyof typeof MENU_FORM_MODE];

interface MenuSettingsPanelProps {
  menus: Menu[];
}

interface MenuFormState {
  name: string;
  isDefault: boolean;
}

function buildEmptyFormState(): MenuFormState {
  return {
    name: "",
    isDefault: false,
  };
}

function buildFormStateFromMenu(menu: Menu): MenuFormState {
  return {
    name: menu.name,
    isDefault: menu.isDefault,
  };
}

function toMenuPayload(formState: MenuFormState): MenuCreateInput | null {
  const name = formState.name.trim();

  if (name.length === 0) {
    return null;
  }

  return {
    name,
    isDefault: formState.isDefault,
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-champagne/24 bg-surface-mid"
      : "border-transparent hover:border-hairline hover:bg-surface-low",
  ].join(" ");
}

function MenuSettingsPanel({ menus }: MenuSettingsPanelProps) {
  const { t } = useTranslation('settings');
  const createMenuMutation = useCreateMenu();
  const updateMenuMutation = useUpdateMenu();
  const deleteMenuMutation = useDeleteMenu();

  const initialMenu = menus[0] ?? null;
  const [mode, setMode] = useState<MenuFormMode>(
    initialMenu ? MENU_FORM_MODE.EDIT : MENU_FORM_MODE.CREATE,
  );
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(initialMenu?.id ?? null);
  const [formState, setFormState] = useState<MenuFormState>(() =>
    initialMenu ? buildFormStateFromMenu(initialMenu) : buildEmptyFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMenuMutation.isPending || updateMenuMutation.isPending;
  const isDeletePending = deleteMenuMutation.isPending;

  const beginCreate = () => {
    setMode(MENU_FORM_MODE.CREATE);
    setSelectedMenuId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
  };

  const beginEdit = (menu: Menu) => {
    setMode(MENU_FORM_MODE.EDIT);
    setSelectedMenuId(menu.id);
    setFormError(null);
    setFormState(buildFormStateFromMenu(menu));
  };

  const handleDelete = async (menu: Menu) => {
    if (menu.isDefault) {
      setFormError(t('menus.cannotDeleteDefault'));
      return;
    }

    const shouldDelete = window.confirm(
      t('menus.confirmDelete', { name: menu.name }),
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteMenuMutation.mutateAsync(menu.id);
      if (selectedMenuId === menu.id) {
        beginCreate();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('menus.deleteError'));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toMenuPayload(formState);
    if (!payload) {
      setFormError(t('menus.error'));
      return;
    }

    if (mode === MENU_FORM_MODE.EDIT && !selectedMenuId) {
      setFormError(t('menus.error'));
      return;
    }

    try {
      if (mode === MENU_FORM_MODE.CREATE) {
        await createMenuMutation.mutateAsync(payload);
      } else if (selectedMenuId) {
        await updateMenuMutation.mutateAsync({ id: selectedMenuId, input: payload });
      }

      beginCreate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('menus.error'));
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t('menus.title')}</h2>

        <Button
          variant="secondary"
          size="small"
          onClick={beginCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('menus.createNew')}
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-hairline xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {menus.map((menu) => {
              const isActive = selectedMenuId === menu.id && mode === MENU_FORM_MODE.EDIT;

              return (
                <div key={menu.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(menu)}
                    className={getListButtonClass(isActive)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-ink">{menu.name}</p>
                      {menu.isDefault ? (
                        <span className="text-[10px] rounded-sm bg-champagne/20 px-1.5 py-0.5 text-champagne font-medium">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isDeletePending) {
                        return;
                      }
                      void handleDelete(menu);
                    }}
                    className="h-auto min-h-[60px] w-8 rounded-card text-ink-dim hover:bg-surface-mid hover:text-danger"
                    aria-label={t('menus.deleteButton')}
                    disabled={isDeletePending || menu.isDefault}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {menus.length === 0 ? (
              <EmptyState>{t('menus.emptyState')}</EmptyState>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-hairline pb-2.5">
            <h3 className="text-[16px] font-medium tracking-[-0.02em] text-ink">
              {mode === MENU_FORM_MODE.CREATE ? t('menus.createNew') : t('menus.editMenu')}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label={t('menus.nameLabel')} htmlFor="menu-name">
              <Input
                id="menu-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
                placeholder={t('menus.namePlaceholder')}
              />
            </FormField>

            <FormField label={t('menus.defaultLabel')} htmlFor="menu-default">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="menu-default"
                  checked={formState.isDefault}
                  onCheckedChange={(checked) => {
                    setFormState((previous) => ({ ...previous, isDefault: checked === true }));
                  }}
                />
                <label htmlFor="menu-default" className="text-[12px] text-ink-dim cursor-pointer">
                  {t('menus.defaultDescription')}
                </label>
              </div>
            </FormField>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-hairline pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                className="rounded-card bg-champagne text-obsidian hover:bg-champagne/90"
                disabled={isSaving}
              >
                {mode === MENU_FORM_MODE.CREATE ? t('menus.createButton') : t('menus.saveButton')}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { MENU_FORM_MODE, MenuSettingsPanel };
