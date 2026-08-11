import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";



mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
    warning: mock(),
    promise: mock(),
    dismiss: mock(),
    message: mock(),
  },
  Toaster: () => null,
}));
import * as featureFlagsStoreModule from "@/modules/feature-flags";

// Snapshot del módulo real ANTES de mockearlo — bun corre todos los archivos de
// test en un solo proceso y mock.module no se aísla entre archivos, así que al
// terminar este archivo restauramos el módulo original (ver afterAll).
const realFeatureFlagsStoreModule = { ...featureFlagsStoreModule };



import * as menuManifestModule from "@/modules/menu/manifest";

// Los paneles de menu se alcanzan por el manifest, no por el barrel: el registry
// los toma de ahí. Se conservan id/flagKey/label/icon reales (las tabs se
// asertan por su label) y sólo se sustituye el panel, que de otro modo pegaría
// a la base de datos al renderizar.
const realMenuManifest = { ...menuManifestModule };

mock.module("@/modules/menu/manifest", () => ({
  ...realMenuManifest,
  productsManifest: {
    ...realMenuManifest.productsManifest,
    settingsPanel: () => (
      <section aria-label="Panel de productos">
        <p>Contenido de productos</p>
      </section>
    ),
  },
  categoriesManifest: {
    ...realMenuManifest.categoriesManifest,
    settingsPanel: () => (
      <section aria-label="Panel de categorías">
        <p>Contenido de categorías</p>
      </section>
    ),
  },
}));

mock.module("./FeatureFlagsPanel", () => ({
  FeatureFlagsPanel: () => (
    <section aria-label="Panel de características">
      <p>Contenido de características</p>
    </section>
  ),
}));

mock.module("@/modules/feature-flags", () => ({
  ...realFeatureFlagsStoreModule,
  useFeatureFlagsStore: mock(() => ({
    flags: { categories_enabled: true, multiple_menus_enabled: false },
    isLoading: false,
  })),
}));

afterAll(() => {
  // Restaura el módulo real del store para los archivos que corren después
  // en el mismo proceso de bun test (Cart.dom, App.dom usan setState/getState).
  mock.module("@/modules/feature-flags", () => realFeatureFlagsStoreModule);
});

import { SettingsModal } from "./SettingsModal";
import { fireEvent, renderWithProviders, screen, within } from "@/test/test-utils";
import { useSettingsStore } from "../settings-store";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";
import { MODULE_REGISTRY } from "@/app/module-registry";
import type { ModuleManifest } from "../module-manifest";

type SettingsModalProps = Parameters<typeof SettingsModal>[0];

function renderSettingsModal(overrides: Partial<SettingsModalProps> = {}) {
  renderWithProviders(
    <SettingsModal
      open={overrides.open ?? true}
      onClose={overrides.onClose ?? mock()}
      registry={overrides.registry ?? MODULE_REGISTRY}
    />,
  );
}

describe("SettingsModal (settings feature)", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      locale: DEFAULT_CURRENCY_CONFIG.locale,
      currency: DEFAULT_CURRENCY_CONFIG.currency,
      printerType: "none",
      printerAddress: null,
      isLoading: false,
    });
    mock.clearAllMocks();
  });

  it("should render the settings shell with General active by default and grouped sidebar", () => {
    // CASE: the operator opens settings from the POS header.
    // VALIDATES: the settings shell renders with grouped sidebar (General + Modules)
    // and the first tab (General) active by default. No content header — the
    // sidebar's active state is the only indicator.

    renderSettingsModal();

    const dialog = screen.getByRole("dialog", { name: /configuración/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Configuración" })).toBeInTheDocument();

    // Sidebar has grouped section headers
    expect(screen.getByText("CONFIGURACIÓN GENERAL")).toBeInTheDocument();
    expect(screen.getByText("MÓDULOS")).toBeInTheDocument();

    // General tabs in sidebar
    expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /características/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /actualizaciones/i })).toBeInTheDocument();

    // Module tabs in sidebar
    expect(screen.getByRole("tab", { name: /productos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /categorías/i })).toBeInTheDocument();

    // General is the active tab (first in general group)
    const generalTab = screen.getByRole("tab", { name: /general/i });
    expect(generalTab).toHaveAttribute("aria-selected", "true");

    // Content panel renders (no heading — sidebar indicates location)
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("should switch sections and track active state in sidebar only", () => {
    // CASE: the operator moves across settings sections from the left navigation.
    // VALIDATES: aria-selected moves to the clicked tab. No content heading to check.

    renderSettingsModal();

    // Act — switch to Categorías
    fireEvent.click(screen.getByRole("tab", { name: /categorías/i }));

    // Assert — Categorías is now selected, General is not
    expect(screen.getByRole("tab", { name: /categorías/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "false");

    // Act — switch back to General
    fireEvent.click(screen.getByRole("tab", { name: /general/i }));

    // Assert — General is selected again
    expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /categorías/i })).toHaveAttribute("aria-selected", "false");
  });

  it("should switch to the General section and show locale/currency selects", async () => {
    // CASE: operator goes to the general settings
    // VALIDATES: form controls render

    renderSettingsModal();

    // General is active by default — verify sidebar state
    expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");

    // Verify selects render with current values (i18n translated)
    const localeTrigger = screen.getByTestId("locale-select-trigger");
    const currencyTrigger = screen.getByTestId("currency-select-trigger");
    expect(localeTrigger).toHaveTextContent("Español (México)");
    expect(currencyTrigger).toHaveTextContent("MXN ($ - Peso Mexicano)");
  });

  it("should call onClose when the operator clicks the close button", () => {
    const onCloseMock = mock();
    renderSettingsModal({ onClose: onCloseMock });

    const closeButton = screen.getByRole("button", { name: /cerrar configuración/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("should switch to the Features section and render feature flags panel", () => {
    // CASE: operator goes to the features settings to manage feature flags
    // VALIDATES: features panel renders when switching to features tab

    renderSettingsModal();

    // Act - switch to Features panel
    fireEvent.click(screen.getByRole("tab", { name: /características/i }));

    // Assert — Features tab is selected
    expect(screen.getByRole("tab", { name: /características/i })).toHaveAttribute("aria-selected", "true");

    // Content panel renders
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("should render the updater tab in the general group", () => {
    // The updater tab now lives in the general group alongside General, Printer, and Features.
    renderSettingsModal();
    expect(screen.getByRole("tab", { name: /actualizaciones/i })).toBeInTheDocument();
  });

  it("should render the updater panel supplied by the registry manifest", () => {
    // CASE: el módulo updater aporta su panel a través del registry.
    // VALIDATES: SettingsModal resuelve el panel desde el manifest con id "updater"
    // y NO desde un import directo al componente — ese import era el ciclo
    // settings ↔ updater que documenta docs/architecture/module-system.md.
    const sentinelRegistry: ModuleManifest[] = [
      {
        id: "updater",
        settingsPanel: () => <p>Panel centinela de actualizaciones</p>,
      },
    ];

    renderSettingsModal({ registry: sentinelRegistry });

    fireEvent.click(screen.getByRole("tab", { name: /actualizaciones/i }));

    expect(screen.getByText("Panel centinela de actualizaciones")).toBeInTheDocument();
  });

  it("should not render the updater tab when no manifest in the registry provides its panel", () => {
    // CASE: el registry no trae el módulo updater (build sin updater, flag apagado
    // aguas arriba, etc.).
    // VALIDATES: la tab desaparece con el manifest. Sin fallback hardcodeado — si
    // el panel no viene del registry, no hay nada que mostrar.
    renderSettingsModal({ registry: [] });

    expect(screen.queryByRole("tab", { name: /actualizaciones/i })).toBeNull();
  });

  it("should use the shared centered dialog surface when settings opens", () => {
    // CASE: The operator opens Settings from the POS header.
    // VALIDATES: Settings uses the shared dialog primitive rather than its own Radix surface.
    // Arrange
    renderSettingsModal();

    // Act
    const dialog = screen.getByRole("dialog", { name: /configuración/i });

    // Assert
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
    expect(dialog.getAttribute("data-layout")).toBe("centered");
  });

});
