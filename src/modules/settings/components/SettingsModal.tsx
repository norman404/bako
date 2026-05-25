import { BarChart3, LayoutGrid, Package, X, Globe, type LucideIcon } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import type { Category } from "@/modules/menu/domain/category";
import type { Product } from "@/modules/menu/domain/product";
import { CategorySettingsPanel } from "@/modules/menu/components/admin/CategorySettingsPanel";
import { ProductSettingsPanel } from "@/modules/menu/components/admin/ProductSettingsPanel";
import { TurnoSummaryPanel } from "@/modules/turno/components/TurnoSummaryPanel";
import { SystemSettingsPanel } from "./SystemSettingsPanel";

const SETTINGS_SECTION = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  SYSTEM: "system",
  TURNO: "turno",
} as const;

type SettingsSection = (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
}

interface SettingsSectionDefinition {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}

const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  { id: SETTINGS_SECTION.PRODUCTS, label: "Productos", icon: Package },
  { id: SETTINGS_SECTION.CATEGORIES, label: "Categorías", icon: LayoutGrid },
  { id: SETTINGS_SECTION.SYSTEM, label: "Sistema", icon: Globe },
  { id: SETTINGS_SECTION.TURNO, label: "Turno", icon: BarChart3 },
];

function getNavigationButtonClass(isActive: boolean): string {
  return [
    "group flex w-full items-center gap-2 rounded-card px-2 py-1.5 text-left transition-[background-color,color] duration-150",
    isActive
      ? "bg-white/[0.045] text-ink"
      : "text-ink-muted hover:bg-white/[0.028] hover:text-ink",
  ].join(" ");
}

function getNavigationIconClass(isActive: boolean): string {
  return isActive ? "text-champagne" : "text-ink-dim group-hover:text-ink";
}

function renderSectionPanel(
  activeSection: SettingsSection,
  props: Pick<SettingsModalProps, "categories" | "products">,
  onOpenCategories: () => void,
) {
  if (activeSection === SETTINGS_SECTION.PRODUCTS) {
    return (
      <ProductSettingsPanel
        categories={props.categories}
        products={props.products}
        onManageCategories={onOpenCategories}
      />
    );
  }

  if (activeSection === SETTINGS_SECTION.CATEGORIES) {
    return <CategorySettingsPanel categories={props.categories} />;
  }

  if (activeSection === SETTINGS_SECTION.SYSTEM) {
    return <SystemSettingsPanel />;
  }

  return <TurnoSummaryPanel />;
}

function SettingsModal({ open, onClose, categories, products }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(SETTINGS_SECTION.PRODUCTS);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        {/* Overlay con blur y oscurecimiento del fondo */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#020202]/84 backdrop-blur-md transition-opacity duration-200 data-[state=open]:animate-fade-in" />
        
        {/* Contenedor del Modal Glassmorphic Obsidian */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[94vh] translate-x-[-50%] translate-y-[-50%] rounded-modal border border-white/5 bg-obsidian/75 shadow-2xl backdrop-blur-md transition-all duration-200 focus:outline-none text-ink grid grid-rows-[auto_1fr] overflow-hidden data-[state=open]:animate-modal-in">
          
          <header className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-2.5 sm:px-5">
            <Dialog.Title className="text-[20px] font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">
              Configuración
            </Dialog.Title>

            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card text-ink-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink"
                aria-label="Cerrar configuración"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="grid min-h-0 lg:grid-cols-[156px_1fr]">
            <aside className="min-h-0 border-b border-hairline px-2 py-2.5 lg:border-b-0 lg:border-r">
              <div
                role="tablist"
                aria-label="Secciones de configuración"
                aria-orientation="vertical"
                className="grid gap-1"
              >
                {SETTINGS_SECTIONS.map((section) => {
                  const SectionIcon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`settings-panel-${section.id}`}
                      id={`settings-tab-${section.id}`}
                      onClick={() => setActiveSection(section.id)}
                      className={getNavigationButtonClass(isActive)}
                    >
                      <SectionIcon
                        className={[
                          "h-4 w-4 shrink-0 transition-colors duration-150",
                          getNavigationIconClass(isActive),
                        ].join(" ")}
                      />
                      <span className="text-[11px] font-medium tracking-[0.01em] text-current">
                        {section.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section
              id={`settings-panel-${activeSection}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeSection}`}
              className="min-h-0 overflow-hidden"
            >
              <div className="scrollbar-thin h-full overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                {renderSectionPanel(activeSection, { categories, products }, () => {
                  setActiveSection(SETTINGS_SECTION.CATEGORIES);
                })}
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { SETTINGS_SECTION, SettingsModal };
