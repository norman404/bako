import type { SVGProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    return function Icon(props: SVGProps<SVGSVGElement>) {
      return <svg aria-hidden="true" data-icon={name} {...props} />;
    };
  };

  return {
    BarChart3: createIcon("BarChart3"),
    LayoutGrid: createIcon("LayoutGrid"),
    Package: createIcon("Package"),
    X: createIcon("X"),
    Globe: createIcon("Globe"),
    Save: createIcon("Save"),
  };
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

vi.mock("@/modules/turno/components/TurnoSummaryPanel", () => ({
  TurnoSummaryPanel: () => (
    <section aria-label="Panel de turno">
      <h2>Turno</h2>
    </section>
  ),
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
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
] as const;

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
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
] as const;

function renderSettingsModal(overrides: Partial<SettingsModalProps> = {}) {
  renderWithProviders(
    <SettingsModal
      open={overrides.open ?? true}
      onClose={overrides.onClose ?? vi.fn()}
      categories={overrides.categories ?? [...BASE_CATEGORIES]}
      products={overrides.products ?? [...BASE_PRODUCTS]}
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
    expect(screen.getByRole("tab", { name: /turno/i })).toBeInTheDocument();

    const activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /productos/i })).toBeInTheDocument();
  });

  it("should switch sections when the operator changes the sidebar selection", () => {
    // CASE: the operator moves across settings sections from the left navigation.
    // VALIDATES: the settings shell orchestrates menu admin and turno panels from other features.

    // Arrange
    renderSettingsModal();

    // Act
    fireEvent.click(screen.getByRole("tab", { name: /categorías/i }));

    // Assert
    let activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^categorías$/i })).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByRole("tab", { name: /turno/i }));

    // Assert
    activePanel = screen.getByRole("tabpanel");
    expect(within(activePanel).getByRole("heading", { name: /^turno$/i })).toBeInTheDocument();
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

    const localeSelect = screen.getByLabelText(/idioma \/ región \(locale\)/i) as HTMLSelectElement;
    const currencySelect = screen.getByLabelText(/moneda \/ divisa/i) as HTMLSelectElement;
    expect(localeSelect.value).toBe("es-MX");
    expect(currencySelect.value).toBe("MXN");

    // Act - change select values
    fireEvent.change(localeSelect, { target: { value: "es-AR" } });
    fireEvent.change(currencySelect, { target: { value: "ARS" } });
    expect(localeSelect.value).toBe("es-AR");
    expect(currencySelect.value).toBe("ARS");

    // Spy on the store updateSettings action
    const spyUpdate = vi.spyOn(useSettingsStore.getState(), "updateSettings");

    // Submit form
    const saveButton = screen.getByRole("button", { name: /guardar cambios/i });
    fireEvent.click(saveButton);

    // Assert
    expect(spyUpdate).toHaveBeenCalledWith("es-AR", "ARS");
    expect(useSettingsStore.getState().locale).toBe("es-AR");
    expect(useSettingsStore.getState().currency).toBe("ARS");
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
});
