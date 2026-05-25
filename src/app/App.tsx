import { Menu, Search, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { CheckoutModal } from "@/modules/checkout/components/CheckoutModal";
import { printOrder } from "@/modules/checkout/components/print-ticket";
import { useCreateOrder, type CreateOrderInput } from "@/modules/checkout/hooks/use-checkout";
import { CategoryNav } from "@/modules/menu/components/CategoryNav";
import { ProductGrid } from "@/modules/menu/components/ProductGrid";
import { filterProductsByCategory, filterProductsByName } from "@/modules/menu/domain/product-filters";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import type { Product } from "@/modules/menu/domain/product";
import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useProducts } from "@/modules/menu/hooks/use-products";
import { Cart } from "@/modules/order/components/Cart";
import { calculateCartTotals } from "@/modules/order/domain/cart";
import { useOrderStore } from "@/modules/order/store/order-store";
import { SettingsModal } from "@/modules/settings/components/SettingsModal";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { POS_CATEGORY_FILTER, usePosStore } from "@/modules/pos/store/pos-store";
import { formatPosCurrency } from "@/lib/currency";
import { IS_MAC } from "@/lib/platform";

export function App() {
  // Suscribirse de manera reactiva a los cambios de locale o currency del Zustand store para forzar un re-render instantáneo de todo el POS
  useSettingsStore();

  const {
    selectedCategory,
    setSelectedCategory,
    checkoutSessionKey,
    isCheckoutOpen,
    openCheckoutModal,
    closeCheckoutModal,
    isMobileCartOpen,
    openMobileCart,
    closeMobileCart,
    toggleMobileCart,
    isSettingsOpen,
    openSettings,
    closeSettings,
    productSearch,
    setProductSearch,
    clearProductSearch,
  } = usePosStore(
    useShallow((state) => ({
      selectedCategory: state.selectedCategory,
      setSelectedCategory: state.setSelectedCategory,
      checkoutSessionKey: state.checkoutSessionKey,
      isCheckoutOpen: state.isCheckoutOpen,
      openCheckoutModal: state.openCheckout,
      closeCheckoutModal: state.closeCheckout,
      isMobileCartOpen: state.isMobileCartOpen,
      openMobileCart: state.openMobileCart,
      closeMobileCart: state.closeMobileCart,
      toggleMobileCart: state.toggleMobileCart,
      isSettingsOpen: state.isSettingsOpen,
      openSettings: state.openSettings,
      closeSettings: state.closeSettings,
      productSearch: state.productSearch,
      setProductSearch: state.setProductSearch,
      clearProductSearch: state.clearProductSearch,
    })),
  );

  const {
    currentOrder,
    addItem,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useOrderStore(
    useShallow((state) => ({
      currentOrder: state.currentOrder,
      addItem: state.addItem,
      handleIncreaseQuantity: state.incrementItemQuantity,
      handleDecreaseQuantity: state.decrementItemQuantity,
      handleRemoveItem: state.removeItem,
      handleClearCart: state.clearOrder,
    })),
  );

  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const isLoading = isProductsLoading || isCategoriesLoading;
  const createOrderMutation = useCreateOrder();

  const orderedProducts = sortProductsForMenu(products, categories);
  const categoryFilteredProducts = filterProductsByCategory(orderedProducts, selectedCategory);
  const visibleProducts = filterProductsByName(categoryFilteredProducts, productSearch);
  const synchronizedCartItems = currentOrder.map((item) => {
    const currentProduct = products.find((product) => product.id === item.product.id);
    return currentProduct ? { ...item, product: currentProduct } : item;
  });
  const cartTotals = calculateCartTotals(synchronizedCartItems);

  const productCountByCategory: Record<string, number> = {};
  for (const product of products) {
    productCountByCategory[product.categoryId] = (productCountByCategory[product.categoryId] ?? 0) + 1;
  }

  const emptyStateTitle =
    selectedCategory === POS_CATEGORY_FILTER.ALL
      ? "Todavía no hay productos cargados"
      : "No hay productos en esta categoría";
  const emptyStateHint =
    selectedCategory === POS_CATEGORY_FILTER.ALL
      ? "Abrí configuración para cargar el menú inicial."
      : "Probá cambiar de categoría o revisá la configuración del menú.";

  const handleAddToCart = (product: Product) => {
    const currentItem = currentOrder.find((item) => item.product.id === product.id);

    addItem(product);

    toast.success(`${product.name} agregado al ticket`, {
      description: currentItem ? `Cantidad: ${currentItem.quantity + 1}` : "Listo para cobrar",
    });
  };

  const openCheckout = () => {
    if (synchronizedCartItems.length === 0) {
      return;
    }

    openCheckoutModal();
  };

  const handleConfirmCheckout = async (input: CreateOrderInput) => {
    const createdOrder = await createOrderMutation.mutateAsync(input);

    let printError: Error | null = null;

    try {
      const productNameById: Record<string, string> = {};
      for (const item of synchronizedCartItems) {
        productNameById[item.product.id] = item.product.name;
      }

      await printOrder({
        ticketNumber: createdOrder.ticketNumber,
        createdAt: createdOrder.createdAt,
        total: createdOrder.total,
        items: input.items.map((item) => ({
          name: productNameById[item.productId] ?? "Producto",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod: createdOrder.payment.method,
        paymentAmount: createdOrder.payment.amount,
        fulfillmentType: input.fulfillmentType ?? (createdOrder.customer ? "delivery" : "local"),
        customer: createdOrder.customer
          ? {
              name: createdOrder.customer.name,
              phone: createdOrder.customer.phone,
              address: createdOrder.customer.address,
            }
          : null,
      });
    } catch (error) {
      printError =
        error instanceof Error ? error : new Error("No pudimos lanzar la impresión del ticket.");
    }

    handleClearCart();
    closeCheckoutModal();
    closeMobileCart();

    toast.success(`Pedido #${createdOrder.ticketNumber} guardado`, {
      description: createdOrder.customer
        ? `${createdOrder.customer.name} · ${createdOrder.customer.phone}`
        : `${cartTotals.itemsCount} productos cobrados en caja`,
    });

    if (printError) {
      toast.error("La venta quedó guardada, pero no pudimos imprimir el ticket", {
        description: printError.message,
      });
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-obsidian text-ink">
      <header className="border-b border-hairline bg-obsidian select-none" data-tauri-drag-region>
        <div
          className={`relative flex h-11 items-center pr-3 sm:pr-4 ${IS_MAC ? "pl-20" : "pl-4"}`}
          data-tauri-drag-region
        >
          {/* Title — absolute center */}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-[14px] font-semibold tracking-[-0.01em] text-ink">
            Bako
          </span>

          {/* Search + actions — right */}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative w-44 sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-dim" />
              <input
                type="search"
                placeholder="Buscar productos..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-7 w-full rounded-card border border-hairline bg-obsidian-raised pl-9 pr-8 text-[13px] text-ink outline-none placeholder:text-ink-dim transition-colors duration-150 focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20"
                aria-label="Buscar productos"
              />
              {productSearch ? (
                <button
                  type="button"
                  onClick={clearProductSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sharp text-ink-dim transition-colors duration-150 hover:text-ink"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openSettings}
              className="flex h-7 w-7 items-center cursor-pointer justify-center rounded-card text-ink-muted transition-colors duration-150 hover:bg-obsidian-elevated hover:text-ink"
              aria-label="Abrir configuración"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleMobileCart}
              className="relative flex h-7 w-7 items-center justify-center rounded-card border border-hairline text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:bg-obsidian-elevated hover:text-ink lg:hidden"
              aria-label="Abrir cuenta"
            >
              <Menu className="h-3.5 w-3.5" />
              {cartTotals.itemsCount > 0 ? (
                <span className="font-mono-tabular absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-sharp bg-champagne px-0.5 text-[9px] font-bold text-obsidian">
                  {cartTotals.itemsCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-24 lg:pb-0">
          <div className="border-b border-hairline px-4 py-3 sm:px-6 lg:px-8">
            <p className="eyebrow">
              {products.length} producto{products.length === 1 ? "" : "s"} · Caja activa
            </p>

            <div className="mt-3 -mx-1 px-1 sm:-mx-5 sm:px-5">
              <CategoryNav
                categories={categories}
                activeCategoryId={selectedCategory}
                onCategoryChange={setSelectedCategory}
                productCountByCategory={productCountByCategory}
              />
            </div>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-card border border-hairline bg-obsidian-raised"
                    style={{ minHeight: "140px" }}
                  />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <section className="relative flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
                <span className="font-display text-6xl leading-none text-ink-dim">⌕</span>
                <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  {emptyStateTitle}
                </p>
                <p className="mt-2 eyebrow">{emptyStateHint}</p>
              </section>
            ) : (
              <ProductGrid
                products={visibleProducts}
                categories={categories}
                activeCategoryId={POS_CATEGORY_FILTER.ALL}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        </section>

        <aside className="hidden w-[30%] min-h-0 min-w-0 overflow-hidden border-l border-hairline bg-obsidian-raised lg:block">
          <Cart
            items={synchronizedCartItems}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={openCheckout}
          />
        </aside>
      </main>

      {cartTotals.itemsCount > 0 && !isMobileCartOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-obsidian/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={openMobileCart}
            className="group relative flex h-16 w-full items-center justify-between overflow-hidden rounded-sharp border border-champagne/30 bg-obsidian-raised px-4 text-ink transition-colors duration-150 hover:border-champagne/60"
          >
            <span className="flex items-center gap-3">
              <span className="font-mono-tabular flex h-9 w-9 items-center justify-center rounded-sharp bg-champagne text-[12px] font-bold text-obsidian">
                {String(cartTotals.itemsCount).padStart(2, "0")}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="eyebrow">Ver comanda</span>
                <span className="mt-1.5 text-[14px] font-bold text-ink">Tu cuenta</span>
              </span>
            </span>
            <span className="font-mono-tabular text-[18px] font-medium tracking-tight text-champagne">
              {formatPosCurrency(cartTotals.total)}
            </span>
          </button>
        </div>
      ) : null}

      {isMobileCartOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar carrito"
            className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm animate-fade-in"
            onClick={closeMobileCart}
          />
          <div className="absolute inset-x-2 bottom-2 top-12 animate-modal-in">
            <button
              type="button"
              onClick={closeMobileCart}
              className="absolute -top-10 right-0 z-10 flex h-9 w-9 items-center justify-center rounded-sharp border border-hairline-strong bg-obsidian-raised text-ink"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <Cart
              items={synchronizedCartItems}
              onIncreaseQuantity={handleIncreaseQuantity}
              onDecreaseQuantity={handleDecreaseQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onCheckout={() => {
                closeMobileCart();
                openCheckout();
              }}
            />
          </div>
        </div>
      ) : null}

      <CheckoutModal
        key={checkoutSessionKey}
        open={isCheckoutOpen}
        items={synchronizedCartItems}
        isSubmitting={createOrderMutation.isPending}
        onClose={closeCheckoutModal}
        onConfirmCheckout={handleConfirmCheckout}
      />

      {isSettingsOpen ? (
        <SettingsModal
          open={isSettingsOpen}
          onClose={closeSettings}
          categories={categories}
          products={products}
        />
      ) : null}
    </div>
  );
}
