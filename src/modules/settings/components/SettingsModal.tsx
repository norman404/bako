import { BarChart3, LayoutGrid, Package, Search, X, Globe, type LucideIcon } from "lucide-react";
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#020202]/96 backdrop-blur-md transition-opacity duration-200 data-[state=open]:animate-fade-in" />
        
        {/* Contenedor del Modal Glassmorphic Obsidian */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[94vh] translate-x-[-50%] translate-y-[-50%] rounded-modal border border-white/5 bg-obsidian/75 shadow-2xl backdrop-blur-md transition-all duration-200 focus:outline-none text-ink grid grid-rows-[auto_auto_1fr] overflow-hidden data-[state=open]:animate-modal-in">
          
          <header className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 sm:px-5">
            <Dialog.Title className="sr-only">Configuración</Dialog.Title>

            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-dim" />
              <input
                type="search"
                placeholder="Buscar configuración..."
                className="h-9 w-full rounded-card border border-hairline bg-obsidian-raised pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-dim transition-colors duration-150 focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20"
                aria-label="Buscar en configuración"
              />
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-hairline text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:bg-white/[0.04] hover:text-ink"
                aria-label="Cerrar configuración"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          {/* Horizontal section tabs */}
          <div className="border-b border-hairline px-4 py-2 sm:px-5">
            <div
              role="tablist"
              aria-label="Secciones de configuración"
              aria-orientation="horizontal"
              className="flex gap-1 overflow-x-auto scrollbar-thin"
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
                    className={[
                      "flex shrink-0 items-center gap-2 rounded-card px-3 py-2 text-left transition-[background-color,color] duration-150",
                      isActive
                        ? "bg-white/[0.045] text-ink"
                        : "text-ink-muted hover:bg-white/[0.028] hover:text-ink",
                    ].join(" ")}
                  >
                    <SectionIcon
                      className={[
                        "h-4 w-4 shrink-0 transition-colors duration-150",
                        isActive ? "text-champagne" : "text-ink-dim",
                      ].join(" ")}
                    />
                    <span className="text-[11px] font-medium tracking-[0.01em] text-current">
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { SETTINGS_SECTION, SettingsModal };
