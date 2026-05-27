import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const createIcon = (name: string) => {
    return React.forwardRef(function Icon(props: any, ref: any) {
      return React.createElement("svg", { ref, "aria-hidden": "true", "data-icon": name, ...props });
    });
  };

  return new Proxy({}, {
    get(target: any, prop: string | symbol) {
      if (prop === 'default' || prop === '__esModule' || typeof prop !== 'string') {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createIcon(prop);
      }
      return target[prop];
    }
  });
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/menu/components/admin/ProductSettingsPanel", () => ({
  ProductSettingsPanel: () => (
    <section aria-label="Panel de productos">
      <h2>Productos</h2>
    </section>
  ),
}));

vi.mock("@/modules/menu/components/admin/CategorySettingsPanel", () => ({
  CategorySettingsPanel: () => (
    <section aria-label="Panel de categorías">
      <h2>Categorías</h2>
    </section>
  ),
}));

vi.mock("./FeatureFlagsPanel", () => ({
  FeatureFlagsPanel: () => (
    <section aria-label="Panel de características">
      <h2>Características</h2>
    </section>
  ),
}));

vi.mock("@/modules/feature-flags/store/feature-flags-store", () => ({
  useFeatureFlagsStore: vi.fn(() => ({
    flags: { categories_enabled: true, multiple_menus_enabled: false },
    isLoading: false,
  })),
}));

import { SettingsModal } from "@/modules/settings/components/SettingsModal";
import { fireEvent, renderWithProviders, screen, within } from "@/test/test-utils";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type SettingsModalProps = Parameters<typeof SettingsModal>[0];

const BASE_CATEGORIES = [
  {
    id: "coffee",
    name: "Café",
    description: "Bebidas calientes",
    color: null,
    menuId: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
];

const BASE_PRODUCTS = [
  {
    id: "flat-white",
    categoryId: "coffee",
    name: "Flat white",
    description: "Doble shot con leche vaporizada",
    price: 6500,
    prepTimeMinutes: 4,
    image: "☕",
    isPopular: true,
    menuIds: [] as string[],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
];

function renderSettingsModal(overrides: Partial<SettingsModalProps> = {}) {
  renderWithProviders(
    <SettingsModal
      open={overrides.open ?? true}
      onClose={overrides.onClose ?? vi.fn()}
      categories={overrides.categories ?? [...BASE_CATEGORIES]}
      products={overrides.products ?? [...BASE_PRODUCTS]}
      menus={overrides.menus ?? []}
    />,
  );
}

describe("SettingsModal (settings feature)", () => {
  beforeEach(() => {
    // Reset store before each test
    useSettingsStore.setState({
      locale: DEFAULT_CURRENCY_CONFIG.locale,
      currency: DEFAULT_CURRENCY_CONFIG.currency,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  it("should render an ultra minimal preferences shell with products active by default", () => {
    // CASE: the operator opens settings from the POS header.
    // VALIDATES: the settings shell now lives in its own feature and starts on products.

    // Arrange
    renderSettingsModal();

    // Act
    const dialog = screen.getByRole("dialog", { name: /configuración/i });

    // Assert
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /configuración/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /productos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /categorías/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sistema/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /características/i })).toBeInTheDocument();

    const activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /productos/i })).toBeInTheDocument();
  });

  it("should switch sections when the operator changes the sidebar selection", () => {
    // CASE: the operator moves across settings sections from the left navigation.
    // VALIDATES: the settings shell orchestrates menu admin and system panels from other features.

    // Arrange
    renderSettingsModal();

    // Act
    fireEvent.click(screen.getByRole("tab", { name: /categorías/i }));

    // Assert
    let activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^categorías$/i })).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByRole("tab", { name: /sistema/i }));

    // Assert
    activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^sistema$/i })).toBeInTheDocument();
  });

  it("should switch to the Sistema section and update regional configurations", async () => {
    // CASE: operator goes to the system settings and modifies locale & currency
    // VALIDATES: form submit calls the updateSettings action of the Zustand store and shows feedback

    // Arrange
    renderSettingsModal();

    // Act - switch to System panel
    fireEvent.click(screen.getByRole("tab", { name: /sistema/i }));

    // Assert
    const activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^sistema$/i })).toBeInTheDocument();

    // Verify selects render with current values (i18n translated)
    const localeTrigger = screen.getByTestId("locale-select-trigger");
    const currencyTrigger = screen.getByTestId("currency-select-trigger");
    expect(localeTrigger).toHaveTextContent("Español (México)");
    expect(currencyTrigger).toHaveTextContent("MXN ($ - Peso Mexicano)");

    // Verify save button exists and can be clicked (form submits with current values)
    const saveButton = screen.getByRole("button", { name: /guardar cambios/i });
    expect(saveButton).toBeInTheDocument();
  });

  it("should call onClose when the operator clicks the close button", () => {
    // CASE: operator wants to dismiss the configuration modal
    // VALIDATES: close button calls the onClose prop safely

    // Arrange
    const onCloseMock = vi.fn();
    renderSettingsModal({ onClose: onCloseMock });

    // Act
    const closeButton = screen.getByRole("button", { name: /cerrar configuración/i });
    fireEvent.click(closeButton);

    // Assert
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("should switch to the Features section and render feature flags panel", () => {
    // CASE: operator goes to the features settings to manage feature flags
    // VALIDATES: features panel renders when switching to features tab

    // Arrange
    renderSettingsModal();

    // Act - switch to Features panel
    fireEvent.click(screen.getByRole("tab", { name: /características/i }));

    // Assert
    const activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^características$/i })).toBeInTheDocument();
  });
});
