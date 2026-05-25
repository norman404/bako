import { okAsync } from "neverthrow";
import type { SVGProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => {
  const iconNames = {
    BIKE: "Bike",
    CREDIT_CARD: "CreditCard",
    HOUSE: "House",
    LOADER_CIRCLE: "LoaderCircle",
    MAP_PIN: "MapPin",
    PHONE: "Phone",
    PLUS: "Plus",
    SEARCH: "Search",
    USER_ROUND: "UserRound",
    WALLET: "Wallet",
    X: "X",
  } as const;

  const createIcon = (name: string) => {
    return function Icon(props: SVGProps<SVGSVGElement>) {
      return <svg aria-hidden="true" data-icon={name} {...props} />;
    };
  };

  return {
    Bike: createIcon(iconNames.BIKE),
    CreditCard: createIcon(iconNames.CREDIT_CARD),
    House: createIcon(iconNames.HOUSE),
    LoaderCircle: createIcon(iconNames.LOADER_CIRCLE),
    MapPin: createIcon(iconNames.MAP_PIN),
    Phone: createIcon(iconNames.PHONE),
    Plus: createIcon(iconNames.PLUS),
    Search: createIcon(iconNames.SEARCH),
    UserRound: createIcon(iconNames.USER_ROUND),
    Wallet: createIcon(iconNames.WALLET),
    X: createIcon(iconNames.X),
  };
});

import { CheckoutModal } from "@/modules/checkout/components/CheckoutModal";
import * as checkoutHooks from "@/modules/checkout/hooks/use-checkout";
import type { CheckoutCustomer, CreateOrderInput } from "@/modules/checkout/hooks/use-checkout";
import { orderDrizzleRepository } from "@/modules/checkout/persistence/order-drizzle.repository";
import type { Product } from "@/modules/menu/domain/product";
import type { CartItem } from "@/modules/order/domain/cart";
import { formatPosCurrency } from "@/lib/currency";
import { fireEvent, renderWithProviders, screen, waitFor } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

type CheckoutModalProps = Parameters<typeof CheckoutModal>[0];

const DELIVERY_CUSTOMER = {
  id: "customer-1",
  name: "Valentina Suárez",
  phone: "11 5555 5555",
  address: "Av. Siempre Viva 742, Timbre B",
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
} satisfies CheckoutCustomer;

function buildProduct(id: string, price: number): Product {
  return {
    id,
    categoryId: "coffee",
    name: `Product ${id}`,
    description: `Description ${id}`,
    price,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  };
}

function buildCartItem(id = "product-1", price = 5500, quantity = 1): CartItem {
  return {
    product: buildProduct(id, price),
    quantity,
  };
}

type UseCustomersResult = ReturnType<typeof checkoutHooks.useCustomers>;

function mockListCustomers(customers: CheckoutCustomer[]) {
  return vi
    .spyOn(orderDrizzleRepository, "listCustomers")
    .mockImplementation(
      () => okAsync(customers) as ReturnType<typeof orderDrizzleRepository.listCustomers>,
    );
}

function mockUseCustomers(overrides: Partial<UseCustomersResult>) {
  return vi.spyOn(checkoutHooks, "useCustomers").mockReturnValue({
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    ...overrides,
  } as UseCustomersResult);
}

function renderCheckoutModal(overrides: Partial<CheckoutModalProps> = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onConfirmCheckout =
    overrides.onConfirmCheckout ?? vi.fn(async (_input: CreateOrderInput) => undefined);

  renderWithProviders(
    <CheckoutModal
      open={overrides.open ?? true}
      items={overrides.items ?? [buildCartItem()]}
      isSubmitting={overrides.isSubmitting ?? false}
      onClose={onClose}
      onConfirmCheckout={onConfirmCheckout}
    />,
  );

  return {
    onClose,
    onConfirmCheckout,
  };
}

describe("CheckoutModal", () => {
  it("renders an ultra minimal checkout shell without redundant helper copy", () => {
    // CASE: the cashier opens the checkout modal for a regular in-store payment.
    // VALIDATES: the modal keeps only functional labels and removes decorative explanatory text.
    renderCheckoutModal();

    expect(screen.getByRole("heading", { name: /cobro/i })).toBeInTheDocument();
    expect(screen.queryByText(/resumen de cobro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/revisá la cuenta antes de confirmar el cobro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/un solo cobro por pedido/i)).not.toBeInTheDocument();
  });

  it("keeps the delivery section compact without descriptive helper copy", async () => {
    // CASE: the cashier switches the order from local pickup to delivery.
    // VALIDATES: the delivery section keeps the customer tools but drops explanatory marketing copy.
    mockListCustomers([]);
    renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));

    expect(await screen.findByRole("button", { name: /buscar cliente/i })).toBeInTheDocument();
    expect(screen.queryByText(/delivery guarda el cliente para reutilizarlo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/buscá por nombre, teléfono o dirección/i)).not.toBeInTheDocument();
  });

  it("keeps the new customer form compact without setup copy", async () => {
    // CASE: the cashier decides to create a new delivery customer during checkout.
    // VALIDATES: the manual form stays minimal and removes instructional filler text.
    mockListCustomers([]);
    renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));
    fireEvent.click(await screen.findByRole("button", { name: /nuevo cliente/i }));

    expect(screen.getByText(/crear cliente nuevo/i)).toBeInTheDocument();
    expect(screen.queryByText(/completá los datos mínimos/i)).not.toBeInTheDocument();
  });

  it("renders the modal and loads delivery customers on demand", async () => {
    const listCustomersSpy = mockListCustomers([DELIVERY_CUSTOMER]);
    const { onClose, onConfirmCheckout } = renderCheckoutModal();

    expect(screen.getByRole("dialog", { name: /confirmar checkout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagar/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));

    expect(screen.getByText("Elegí uno guardado o cargá uno nuevo")).toBeInTheDocument();
    expect(await screen.findByText(DELIVERY_CUSTOMER.name)).toBeInTheDocument();
    expect(listCustomersSpy).toHaveBeenCalledWith("");

    fireEvent.click(screen.getByRole("button", { name: new RegExp(DELIVERY_CUSTOMER.name, "i") }));

    expect(await screen.findByText("Cliente seleccionado")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirmCheckout).not.toHaveBeenCalled();
  });

  it("muestra el input de efectivo por defecto y el bloque de tarjeta al cambiar el método", () => {
    renderCheckoutModal();

    expect(screen.getByLabelText(/recibido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tarjeta/i }));

    expect(screen.getByText(/cobro exacto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/recibido/i)).not.toBeInTheDocument();
  });

  it("calcula y muestra el cambio cuando el efectivo recibido supera el total", async () => {
    const item = buildCartItem();
    const total = item.product.price * item.quantity;
    renderCheckoutModal({ items: [item] });

    const input = screen.getByLabelText(/recibido/i) as HTMLInputElement;
    input.value = "100.00";
    fireEvent.input(input);

    expect(await screen.findByText(formatPosCurrency(10000 - total))).toBeInTheDocument();
  });

  it("valida montos vacíos, inválidos e insuficientes antes de habilitar pagar", async () => {
    const item = buildCartItem();
    const total = item.product.price * item.quantity;
    renderCheckoutModal({ items: [item] });

    const input = screen.getByLabelText(/recibido/i) as HTMLInputElement;
    const payButton = screen.getByRole("button", { name: /pagar/i });

    expect(payButton).toBeEnabled();

    input.value = "";
    fireEvent.input(input);

    expect(await screen.findByText("Ingresá el monto recibido en efectivo.")).toBeInTheDocument();
    expect(payButton).toBeDisabled();

    input.value = ".";
    fireEvent.input(input);

    expect(await screen.findByText("Ingresá un monto válido en efectivo.")).toBeInTheDocument();
    expect(payButton).toBeDisabled();

    input.value = "10.00";
    fireEvent.input(input);

    expect(
      await screen.findByText(`El efectivo recibido debe cubrir ${formatPosCurrency(total)}.`),
    ).toBeInTheDocument();
    expect(payButton).toBeDisabled();
  });

  it("muestra la sección de cliente solo para delivery", async () => {
    const listCustomersSpy = mockListCustomers([]);
    renderCheckoutModal();

    expect(screen.queryByText(/elegí uno guardado o cargá uno nuevo/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));

    expect(await screen.findByText(/elegí uno guardado o cargá uno nuevo/i)).toBeInTheDocument();
    expect(listCustomersSpy).toHaveBeenCalledWith("");

    fireEvent.click(screen.getByRole("button", { name: /local/i }));

    expect(screen.queryByText(/elegí uno guardado o cargá uno nuevo/i)).not.toBeInTheDocument();
  });

  it("muestra el estado vacío de clientes y deja abrir el alta manual", async () => {
    mockListCustomers([]);
    renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));

    expect(
      await screen.findByText(/todavía no hay clientes guardados para delivery\./i),
    ).toBeInTheDocument();

    const newCustomerButtons = screen.getAllByRole("button", { name: /nuevo cliente/i });

    expect(newCustomerButtons).toHaveLength(2);
    fireEvent.click(newCustomerButtons[1]);

    expect(screen.getByText(/crear cliente nuevo/i)).toBeInTheDocument();
  });

  it("requiere nombre, teléfono y dirección para crear un cliente delivery nuevo", async () => {
    mockListCustomers([]);
    const { onConfirmCheckout } = renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /nuevo cliente/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    expect(
      await screen.findByText(/para delivery necesitás cliente, teléfono y dirección\./i),
    ).toBeInTheDocument();
    expect(onConfirmCheckout).not.toHaveBeenCalled();
  });

  it("muestra el estado de guardado y bloquea acciones mientras se envía", () => {
    renderCheckoutModal({ isSubmitting: true });

    expect(screen.getByLabelText(/cerrar/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("muestra loader de búsqueda de clientes mientras se cargan", () => {
    mockUseCustomers({ isPending: true });
    renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));
    fireEvent.click(screen.getByRole("button", { name: /buscar cliente/i }));

    expect(screen.getByText(/buscando clientes\.\.\./i)).toBeInTheDocument();
  });

  it("muestra mensaje cuando la búsqueda de clientes falla", async () => {
    mockUseCustomers({
      isError: true,
      error: new Error("boom clientes"),
    });
    renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /delivery/i }));
    fireEvent.click(screen.getByRole("button", { name: /buscar cliente/i }));

    expect(await screen.findByText(/boom clientes/i)).toBeInTheDocument();
  });

  it("muestra error general cuando onConfirmCheckout falla", async () => {
    const onConfirmCheckout = vi.fn(async () => {
      throw new Error("No pudimos guardar");
    });

    renderCheckoutModal({ onConfirmCheckout });
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    expect(await screen.findByText(/no pudimos guardar/i)).toBeInTheDocument();
    expect(onConfirmCheckout).toHaveBeenCalledTimes(1);
  });

  it("deshabilita pagar cuando no hay productos", () => {
    renderCheckoutModal({ items: [] });

    expect(screen.getByRole("button", { name: /pagar/i })).toBeDisabled();
  });

  it("llama onConfirmCheckout con payload correcto para tarjeta", async () => {
    const item = buildCartItem("product-1", 5500, 2);
    const total = item.product.price * item.quantity;
    const onConfirmCheckout = vi.fn(async (_input: CreateOrderInput) => undefined);

    renderCheckoutModal({ items: [item], onConfirmCheckout });

    fireEvent.click(screen.getByRole("button", { name: /tarjeta/i }));
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(onConfirmCheckout).toHaveBeenCalledTimes(1));

    const payload = onConfirmCheckout.mock.calls[0][0] as CreateOrderInput;
    expect(payload.payment.method).toBe("card");
    expect(payload.payment.amount).toBe(total);
    expect(payload.items[0]).toMatchObject({
      productId: item.product.id,
      unitPrice: item.product.price,
      quantity: item.quantity,
    });
  });

  it("llama onClose desde cancelar y cerrar cuando no se está enviando", () => {
    const { onClose } = renderCheckoutModal();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/cerrar/i));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
