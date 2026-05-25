import { BarChart3, LayoutGrid, Package, X, Globe, type LucideIcon } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/Button";

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-crust/96 backdrop-blur-md transition-opacity duration-200 data-[state=open]:animate-fade-in" />
        
        {/* Contenedor del Modal Glassmorphic Obsidian */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[94vh] translate-x-[-50%] translate-y-[-50%] rounded-modal border border-hairline modal-shell-solid shadow-2xl transition-all duration-200 focus:outline-none text-ink grid grid-rows-[auto_1fr] overflow-hidden data-[state=open]:animate-modal-in">
          
          <header className="flex items-center justify-between border-b border-hairline px-4 py-2.5 sm:px-5">
            <Dialog.Title className="text-[13px] font-semibold tracking-wide text-ink">Configuración</Dialog.Title>

            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar configuración"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          {/* Two-column layout: sidebar + content */}
          <div className="grid grid-cols-[200px_1fr] min-h-0 overflow-hidden">

            {/* Left sidebar nav */}
            <nav
              role="tablist"
              aria-label="Secciones de configuración"
              aria-orientation="vertical"
              className="flex flex-col gap-0.5 border-r border-hairline p-2 overflow-y-auto"
            >
              {SETTINGS_SECTIONS.map((section) => {
                const SectionIcon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <Button
                    key={section.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`settings-panel-${section.id}`}
                    id={`settings-tab-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    variant="ghost"
                    className={[
                      "w-full justify-start gap-2.5 rounded-card px-3 py-2.5",
                      isActive ? "bg-obsidian-elevated text-ink" : "text-ink-muted",
                    ].join(" ")}
                  >
                    <SectionIcon
                      className={[
                        "h-4 w-4 shrink-0 transition-colors duration-150",
                        isActive ? "text-champagne" : "text-ink-dim",
                      ].join(" ")}
                    />
                    <span className="text-[12px] font-medium tracking-[0.01em]">
                      {section.label}
                    </span>
                  </Button>
                );
              })}
            </nav>

            {/* Content panel */}
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
