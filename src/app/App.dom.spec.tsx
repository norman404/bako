import { describe, expect, it, mock, spyOn, beforeEach, afterEach, afterAll, type Mock } from "bun:test";




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
// ── Snapshots de los módulos reales ANTES de mockearlos ──────────────────────
// bun test corre todos los archivos en un solo proceso y mock.module no se
// aísla entre archivos: al terminar este archivo se restauran los módulos
// originales (ver afterAll al final de esta sección).
import * as actualSonner from "sonner";
import * as actualTauriCore from "@tauri-apps/api/core";
import * as actualUseMountEffect from "@/lib/use-mount-effect";
import * as actualUseMenus from "@/modules/menu/hooks/use-menus";
import * as actualUseShiftReports from "@/modules/shift-reports/hooks/use-shift-reports";
import * as actualUpdater from "@/modules/updater";
import * as actualPrintTicket from "@/modules/checkout/components/print-ticket";
import * as actualUsePrintCommands from "@/modules/checkout/hooks/use-print-commands";
import * as actualUseCheckoutModule from "@/modules/checkout/hooks/use-checkout";

const REAL_MODULES: ReadonlyArray<[specifier: string, exports: Record<string, unknown>]> = [
  ["sonner", { ...actualSonner }],
  ["@tauri-apps/api/core", { ...actualTauriCore }],
  ["@/lib/use-mount-effect", { ...actualUseMountEffect }],
  ["@/modules/menu/hooks/use-menus", { ...actualUseMenus }],
  ["@/modules/shift-reports/hooks/use-shift-reports", { ...actualUseShiftReports }],
  ["@/modules/updater", { ...actualUpdater }],
  ["@/modules/checkout/components/print-ticket", { ...actualPrintTicket }],
  ["@/modules/checkout/hooks/use-print-commands", { ...actualUsePrintCommands }],
  ["@/modules/checkout/hooks/use-checkout", { ...actualUseCheckoutModule }],
];

const actualUseCheckout = { ...actualUseCheckoutModule };

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

mock.module("@/lib/use-mount-effect", () => ({
  useMountEffect: mock(() => undefined),
}));

mock.module("@/modules/menu/hooks/use-menus", () => ({
  useMenus: mock(() => ({ data: [], isLoading: false })),
}));

mock.module("@/modules/shift-reports/hooks/use-shift-reports", () => ({
  useActiveShift: mock(() => ({ data: undefined, isLoading: false })),
}));

mock.module("@/modules/updater", () => ({
  useUpdater: mock(() => ({
    status: { kind: "idle" },
    isChecking: false,
    hasUpdate: false,
    isDownloading: false,
    isReadyToInstall: false,
    error: null,
    checkForUpdates: mock(),
    downloadAndInstall: mock(),
    relaunch: mock(),
    reset: mock(),
  })),
  UpdateToast: () => null,
}));

mock.module("@/modules/checkout/components/print-ticket", () => ({
  printOrder: mock(() => ({
    mapErr: mock(() => undefined),
  })),
}));

mock.module("@/modules/checkout/hooks/use-print-commands", () => ({
  usePrintCommands: mock(() => ({
    printCommands: mock().mockResolvedValue([]),
  })),
}));

mock.module("@/modules/checkout/hooks/use-checkout", () => ({
  ...actualUseCheckout,
  useCreateOrder: mock(() => ({
    mutateAsync: mock(),
    isPending: false,
  })),
}));

afterAll(() => {
  // Restaura los módulos reales para los archivos que corren después en el
  // mismo proceso de bun test.
  for (const [specifier, exports] of REAL_MODULES) {
    mock.module(specifier, () => exports);
  }
});

import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/test/test-utils";
import { App } from "@/app/App";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { useOrderStore } from "@/modules/order/store/order-store";
import { usePosStore } from "@/shared/stores/pos-store";
import { useCreateOrder } from "@/modules/checkout/hooks/use-checkout";
import { printOrder } from "@/modules/checkout/components/print-ticket";
import { usePrintCommands } from "@/modules/checkout/hooks/use-print-commands";
import * as filteredProductsHook from "@/modules/menu/hooks/use-filtered-products";
import * as modifierGroupsHook from "@/modules/menu/hooks/use-modifier-groups";
import type { Category } from "@/modules/menu/domain/category";
import type { Product } from "@/modules/menu/domain/product";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import {
  buildCategory,
  buildModifierGroup,
  buildModifierOption,
  buildProduct,
} from "@/modules/menu/test/factories";

type UseFilteredProductsResult = ReturnType<typeof filteredProductsHook.useFilteredProducts>;

function setModifierFlag(value: boolean) {
  useFeatureFlagsStore.setState({
    flags: { ...useFeatureFlagsStore.getState().flags, modifier_groups_enabled: value },
  });
}

function setComandasFlag(value: boolean) {
  useFeatureFlagsStore.setState({
    flags: { ...useFeatureFlagsStore.getState().flags, comandas_enabled: value },
  });
}

function setReceiptPrintingFlag(value: boolean) {
  useFeatureFlagsStore.setState({
    flags: { ...useFeatureFlagsStore.getState().flags, receipt_printing_enabled: value },
  });
}

function mockFilteredProducts(opts: {
  products: Product[];
  categories?: Category[];
} = { products: [] }) {
  const categories = opts.categories ?? [buildCategory()];
  return spyOn(filteredProductsHook, "useFilteredProducts")
    .mockReturnValue({
      products: opts.products,
      categories,
      visibleProducts: opts.products,
      productCountByCategory: {},
      isLoading: false,
    } as unknown as UseFilteredProductsResult);
}

function mockProductModifierGroups(groupsByProductId: Record<string, ModifierGroup[]>) {
  return spyOn(modifierGroupsHook, "useProductModifierGroupsMap").mockImplementation(
    (products: Product[]) => {
      const map: Record<string, ModifierGroup[]> = {};
      for (const product of products) {
        map[product.id] = groupsByProductId[product.id] ?? [];
      }
      return map;
    },
  );
}

function renderApp() {
  return renderWithProviders(<App />);
}

describe("App — print ticket modifiers", () => {
  const mockedUseCreateOrder = useCreateOrder as Mock<typeof useCreateOrder>;
  const mockedPrintOrder = printOrder as Mock<typeof printOrder>;

  beforeEach(() => {
    mock.restore();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
    setModifierFlag(false);
    setComandasFlag(false);
  });

  afterEach(() => {
    mock.clearAllMocks();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
  });

  it("maps each cart line's modifiers to the correct print item when the same product has different modifiers", async () => {
    // GIVEN modifier groups are enabled and "Café" has a single-choice group with two options
    setModifierFlag(true);
    const product = buildProduct({ id: "prod-cafe", name: "Café", price: 5000 });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({
      "prod-cafe": [
        buildModifierGroup({
          id: "g1",
          name: "Nivel de hielo",
          type: "single",
          required: false,
          options: [
            buildModifierOption({ id: "opt-sin", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
            buildModifierOption({ id: "opt-extra", name: "Extra hielo", priceDelta: 500, isDefault: false, sortOrder: 1 }),
          ],
        }),
      ],
    });

    mockedUseCreateOrder.mockReturnValue({
      mutateAsync: mock().mockResolvedValue({
        id: "order-1",
        ticketNumber: 42,
        customerId: null,
        deliveryPersonId: null,
        shiftId: null,
        total: 10500,
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
        customer: null,
        items: [],
        payment: {
          id: "pay-1",
          orderId: "order-1",
          method: "card",
          amount: 10500,
          createdAt: new Date("2026-07-11T10:00:00.000Z"),
        },
      }),
      isPending: false,
    } as any);

    renderApp();

    // WHEN the user adds "Café" with default "Sin hielo" and then with "Extra hielo"
    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    await waitFor(() => screen.getByRole("radiogroup", { name: /nivel de hielo/i }));
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    await waitFor(() => screen.getByRole("radiogroup", { name: /nivel de hielo/i }));
    fireEvent.click(screen.getByLabelText(/extra hielo/i));
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(2));

    // AND opens checkout and pays with card
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));
    const checkoutDialog = screen.getByRole("dialog", { name: /confirmar checkout/i });
    fireEvent.click(screen.getByRole("button", { name: /tarjeta/i }));
    const payButton = within(checkoutDialog).getByRole("button", { name: /pagar/i });
    expect(payButton).toBeEnabled();
    fireEvent.click(payButton);

    // THEN printOrder must be called with each line's own modifiers
    await waitFor(() => expect(mockedPrintOrder).toHaveBeenCalledTimes(1));
    const printPayload = mockedPrintOrder.mock.calls[0][0];
    expect(printPayload.items).toHaveLength(2);
    expect(printPayload.items[0].modifiers).toEqual([
      { groupName: "Nivel de hielo", optionName: "Sin hielo", textValue: null },
    ]);
    expect(printPayload.items[1].modifiers).toEqual([
      { groupName: "Nivel de hielo", optionName: "Extra hielo", textValue: null },
    ]);
  });
});

describe("App — handleAddToCart wiring (Phase 7)", () => {
  beforeEach(() => {
    mock.restore();
    useOrderStore.setState({ currentOrder: [] });
    setModifierFlag(false);
  });

  it("flag OFF: clicking a product with modifier groups adds directly to cart (legacy)", async () => {
    // GIVEN the modifier_groups_enabled flag is OFF
    setModifierFlag(false);
    // AND a product "Café" with effective modifier groups ["g1"]
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({ "prod-cafe": [buildModifierGroup({ id: "g1" })] });

    renderApp();

    // WHEN the user clicks the "Café" card
    const card = screen.getByRole("button", { name: /agregar café/i });
    fireEvent.click(card);

    // THEN "Café" MUST be added to the cart with quantity 1
    await waitFor(() => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toHaveLength(1);
      expect(state.currentOrder[0].product.id).toBe("prod-cafe");
      expect(state.currentOrder[0].quantity).toBe(1);
      expect(state.currentOrder[0].selectedModifiers).toEqual([]);
    });

    // AND no dialog is opened
    expect(screen.queryByRole("radiogroup", { name: /nivel de hielo/i })).not.toBeInTheDocument();
  });

  it("flag ON + product with modifier groups: clicking opens dialog and does NOT add yet", async () => {
    // GIVEN the modifier_groups_enabled flag is ON
    setModifierFlag(true);
    // AND a product "Café" with effective modifier groups ["g1"]
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({ "prod-cafe": [buildModifierGroup({ id: "g1", name: "Nivel de hielo" })] });

    renderApp();

    // WHEN the user clicks the "Café" card
    const card = screen.getByRole("button", { name: /agregar café/i });
    fireEvent.click(card);

    // THEN the ProductCustomizationDialog MUST open
    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: /nivel de hielo/i })).toBeInTheDocument();
    });

    // AND no item is added to the cart yet
    expect(useOrderStore.getState().currentOrder).toHaveLength(0);
  });

  it("flag ON + product WITHOUT modifier groups: clicking adds directly (existing behavior)", async () => {
    // GIVEN the modifier_groups_enabled flag is ON
    setModifierFlag(true);
    // AND a product "Té" with NO effective modifier groups
    const product = buildProduct({ id: "prod-te", name: "Té" });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({ "prod-te": [] });

    renderApp();

    // WHEN the user clicks the "Té" card
    fireEvent.click(screen.getByRole("button", { name: /agregar té/i }));

    // THEN "Té" MUST be added to the cart with quantity 1
    await waitFor(() => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toHaveLength(1);
      expect(state.currentOrder[0].product.id).toBe("prod-te");
      expect(state.currentOrder[0].quantity).toBe(1);
      expect(state.currentOrder[0].selectedModifiers).toEqual([]);
    });

    // AND no dialog is opened
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("flag ON: confirming the dialog adds the product with the selected modifiers", async () => {
    // GIVEN flag ON and product "Café" with groups ["g1"] with options "Sin hielo" (default) and "Extra hielo"
    setModifierFlag(true);
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({
      "prod-cafe": [
        buildModifierGroup({
          id: "g1",
          name: "Nivel de hielo",
          type: "single",
          required: false,
          options: [
            buildModifierOption({ id: "opt-sin", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
            buildModifierOption({ id: "opt-extra", name: "Extra hielo", priceDelta: 500, isDefault: false, sortOrder: 1 }),
          ],
        }),
      ],
    });

    renderApp();

    // WHEN the user clicks the card → dialog opens → user selects "Extra hielo" → clicks "Agregar"
    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));

    await waitFor(() => screen.getByRole("radiogroup", { name: /nivel de hielo/i }));
    fireEvent.click(screen.getByLabelText(/extra hielo/i));
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));

    // THEN the cart MUST contain "Café" with the "Extra hielo" modifier (not collapsed to empty)
    await waitFor(() => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toHaveLength(1);
      const item = state.currentOrder[0];
      expect(item.product.id).toBe("prod-cafe");
      expect(item.selectedModifiers).toHaveLength(1);
      expect(item.selectedModifiers[0]).toMatchObject({
        groupId: "g1",
        optionId: "opt-extra",
        optionName: "Extra hielo",
        priceDelta: 500,
      });
    });

    // AND the dialog MUST be closed
    await waitFor(() => {
      expect(screen.queryByRole("radiogroup", { name: /nivel de hielo/i })).not.toBeInTheDocument();
    });
  });

  it("flag ON: same product with different modifiers produces distinct cart lines (no collapse)", async () => {
    // GIVEN flag ON and "Café" already in cart with "Extra hielo"
    setModifierFlag(true);
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    mockFilteredProducts({ products: [product] });
    mockProductModifierGroups({
      "prod-cafe": [
        buildModifierGroup({
          id: "g1",
          name: "Nivel de hielo",
          type: "single",
          required: false,
          options: [
            buildModifierOption({ id: "opt-sin", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
            buildModifierOption({ id: "opt-extra", name: "Extra hielo", priceDelta: 500, isDefault: false, sortOrder: 1 }),
          ],
        }),
      ],
    });

    renderApp();

    // First add: default "Sin hielo"
    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    await waitFor(() => screen.getByRole("radiogroup", { name: /nivel de hielo/i }));
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));

    await waitFor(() => {
      expect(useOrderStore.getState().currentOrder).toHaveLength(1);
    });

    // Second add: change to "Extra hielo"
    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    await waitFor(() => screen.getByRole("radiogroup", { name: /nivel de hielo/i }));
    fireEvent.click(screen.getByLabelText(/extra hielo/i));
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));

    // THEN the cart MUST contain two distinct lines for "Café"
    await waitFor(() => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toHaveLength(2);
      expect(state.currentOrder[0].lineId).not.toBe(state.currentOrder[1].lineId);
      expect(state.currentOrder[0].product.id).toBe("prod-cafe");
      expect(state.currentOrder[1].product.id).toBe("prod-cafe");
    });
  });
});

describe("App — comandas", () => {
  const mockedUseCreateOrder = useCreateOrder as Mock<typeof useCreateOrder>;
  const mockedUsePrintCommands = usePrintCommands as Mock<typeof usePrintCommands>;

  beforeEach(() => {
    mock.restore();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
    setModifierFlag(false);
    setComandasFlag(false);
  });

  afterEach(() => {
    mock.clearAllMocks();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
  });

  it("prints one command per destination printer when flag is ON", async () => {
    setComandasFlag(true);

    const kitchenPrinter = { id: "printer-kitchen", type: "network", address: "192.168.1.50:9100" };
    const barPrinter = { id: "printer-bar", type: "network", address: "192.168.1.51:9100" };
    const mockPrintCommands = mock().mockResolvedValue([]);
    mockedUsePrintCommands.mockReturnValue({ printCommands: mockPrintCommands });

    const categories = [
      buildCategory({ id: "cat-food", name: "Comidas", printerId: kitchenPrinter.id }),
      buildCategory({ id: "cat-drinks", name: "Bebidas", printerId: barPrinter.id }),
    ];
    const taco = buildProduct({ id: "prod-taco", name: "Taco", categoryId: "cat-food", price: 5000 });
    const soda = buildProduct({ id: "prod-soda", name: "Gaseosa", categoryId: "cat-drinks", price: 3000 });
    mockFilteredProducts({ products: [taco, soda], categories });

    mockedUseCreateOrder.mockReturnValue({
      mutateAsync: mock().mockResolvedValue({
        id: "order-1",
        ticketNumber: 42,
        customerId: null,
        deliveryPersonId: null,
        shiftId: null,
        total: 8000,
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
        customer: null,
        items: [],
        payment: {
          id: "pay-1",
          orderId: "order-1",
          method: "card",
          amount: 8000,
          createdAt: new Date("2026-07-11T10:00:00.000Z"),
        },
      }),
      isPending: false,
    } as any);

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /agregar taco/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /agregar gaseosa/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));
    const checkoutDialog = screen.getByRole("dialog", { name: /confirmar checkout/i });
    fireEvent.click(screen.getByRole("button", { name: /tarjeta/i }));
    fireEvent.click(within(checkoutDialog).getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(mockPrintCommands).toHaveBeenCalledTimes(1));

    const calls = mockPrintCommands.mock.calls;
    expect(calls[0]).toHaveLength(1); // printCommands now takes a single argument
    expect(calls[0][0]).toHaveLength(2); // cart items
  });

  it("does not print commands when flag is OFF", async () => {
    setComandasFlag(false);

    const mockPrintCommands = mock().mockResolvedValue([]);
    mockedUsePrintCommands.mockReturnValue({ printCommands: mockPrintCommands });

    const category = buildCategory({ id: "cat-food", name: "Comidas", printerId: "printer-kitchen" });
    const taco = buildProduct({ id: "prod-taco", name: "Taco", categoryId: "cat-food", price: 5000 });
    mockFilteredProducts({ products: [taco], categories: [category] });

    mockedUseCreateOrder.mockReturnValue({
      mutateAsync: mock().mockResolvedValue({
        id: "order-1",
        ticketNumber: 1,
        customerId: null,
        deliveryPersonId: null,
        shiftId: null,
        total: 5000,
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
        customer: null,
        items: [],
        payment: {
          id: "pay-1",
          orderId: "order-1",
          method: "cash",
          amount: 5000,
          createdAt: new Date("2026-07-11T10:00:00.000Z"),
        },
      }),
      isPending: false,
    } as any);

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /agregar taco/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));
    const checkoutDialog = screen.getByRole("dialog", { name: /confirmar checkout/i });
    fireEvent.click(screen.getByRole("button", { name: /efectivo/i }));
    fireEvent.click(within(checkoutDialog).getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(mockedUseCreateOrder().mutateAsync).toHaveBeenCalled());
    expect(mockPrintCommands).not.toHaveBeenCalled();
  });
});

describe("App — receipt printing flag", () => {
  const mockedUseCreateOrder = useCreateOrder as Mock<typeof useCreateOrder>;
  const mockedPrintOrder = printOrder as Mock<typeof printOrder>;

  beforeEach(() => {
    mock.restore();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
    setModifierFlag(false);
    setComandasFlag(false);
    setReceiptPrintingFlag(true);
  });

  afterEach(() => {
    mock.clearAllMocks();
    useOrderStore.setState({ currentOrder: [] });
    usePosStore.setState({
      selectedCategory: "all",
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });
    setReceiptPrintingFlag(true);
  });

  function mockOrderCreation(overrides: Record<string, unknown> = {}) {
    const mutateAsync = mock().mockResolvedValue({
      id: "order-1",
      ticketNumber: 7,
      customerId: null,
      deliveryPersonId: null,
      shiftId: null,
      total: 5000,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      customer: null,
      items: [],
      payment: {
        id: "pay-1",
        orderId: "order-1",
        method: "cash",
        amount: 5000,
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
      },
      ...overrides,
    });
    mockedUseCreateOrder.mockReturnValue({ mutateAsync, isPending: false } as any);
    return mutateAsync;
  }

  function setupCartWithTaco() {
    const category = buildCategory({ id: "cat-food", name: "Comidas" });
    const taco = buildProduct({ id: "prod-taco", name: "Taco", categoryId: "cat-food", price: 5000 });
    mockFilteredProducts({ products: [taco], categories: [category] });
  }

  it("flag OFF: skips the receipt ticket print but still completes the checkout flow", async () => {
    setReceiptPrintingFlag(false);
    setupCartWithTaco();
    const mutateAsync = mockOrderCreation();

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /agregar taco/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));
    const checkoutDialog = screen.getByRole("dialog", { name: /confirmar checkout/i });
    fireEvent.click(screen.getByRole("button", { name: /efectivo/i }));
    fireEvent.click(within(checkoutDialog).getByRole("button", { name: /pagar/i }));

    // THEN the order is still created and the checkout flow completes normally
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(0));

    // AND the receipt ticket print is skipped
    expect(mockedPrintOrder).not.toHaveBeenCalled();
  });

  it("flag ON (default): prints the receipt ticket on checkout", async () => {
    setReceiptPrintingFlag(true);
    setupCartWithTaco();
    mockOrderCreation();

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /agregar taco/i }));
    await waitFor(() => expect(useOrderStore.getState().currentOrder).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));
    const checkoutDialog = screen.getByRole("dialog", { name: /confirmar checkout/i });
    fireEvent.click(screen.getByRole("button", { name: /efectivo/i }));
    fireEvent.click(within(checkoutDialog).getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(mockedPrintOrder).toHaveBeenCalledTimes(1));
  });
});
