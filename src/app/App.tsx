import { Menu, SearchX, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { CheckoutModal } from "@/modules/checkout/components/CheckoutModal";
import { DeliveryPersonSelect } from "@/modules/delivery";
import { printOrder } from "@/modules/checkout/components/print-ticket";
import { useCreateOrder, type CreateOrderInput } from "@/modules/checkout/hooks/use-checkout";
import { CategoryNav } from "@/modules/menu/components/CategoryNav";
import { MenuSelector } from "@/modules/menu/components/MenuSelector";
import { ProductCustomizationDialog } from "@/modules/menu/components/ProductCustomizationDialog";
import { ProductGrid } from "@/modules/menu/components/ProductGrid";
import { ProductSearch } from "@/modules/menu/components/ProductSearch";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";
import { useMenus } from "@/modules/menu/hooks/use-menus";
import { useFilteredProducts } from "@/modules/menu/hooks/use-filtered-products";
import { useProductModifierGroupsMap } from "@/modules/menu/hooks/use-modifier-groups";
import { Cart } from "@/modules/order/components/Cart";
import { calculateCartTotals } from "@/modules/order/domain/cart";
import { useOrderStore } from "@/modules/order/store/order-store";
import { SettingsModal } from "@/modules/settings/components/SettingsModal";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { ShiftButton } from "@/modules/shift-reports";
import { useActiveShift } from "@/modules/shift-reports/hooks/use-shift-reports";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { useUpdater, UpdateToast } from "@/modules/updater";
import { POS_CATEGORY_FILTER, usePosStore } from "@/shared/stores/pos-store";
import { formatPosCurrency } from "@/lib/currency";
import { IS_MAC } from "@/lib/platform";
import { useMountEffect } from "@/lib/use-mount-effect";
import { MODULE_REGISTRY } from "@/app/module-registry";

export function App() {
  const { t } = useTranslation(['app', 'menu']);

  // Suscribirse de manera reactiva a los cambios de locale o currency del Zustand store para forzar un re-render instantáneo de todo el POS
  useSettingsStore();

  // Read feature flags (sync from Zustand store)
  const { flags } = useFeatureFlagsStore();
  const categoriesEnabled = flags.categories_enabled ?? false;
  const multipleMenusEnabled = flags.multiple_menus_enabled ?? false;
  const deliveryEnabled = flags.delivery_enabled ?? false;
  const shiftManagementEnabled = flags.shift_management_enabled ?? false;

  const updater = useUpdater();

  // Trigger a background check for updates when the app mounts if auto updates
  // are enabled. The single useUpdater instance owns the status, and UpdateToast
  // renders it. This is the simplest wiring for a single-screen app without a
  // global provider.
  useMountEffect(() => {
    if (flags.auto_update_enabled) {
      updater.checkForUpdates();
    }
  });

  // Shift state
  const { data: activeShift } = useActiveShift();

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

  // Conditional data fetching based on feature flags
  const { data: menus = [] } = useMenus();

  // Select default menu or first available menu (derived state)
  const defaultMenu = menus.find((m) => m.isDefault) ?? menus[0];
  const defaultMenuId = defaultMenu?.id ?? null;

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  // Sync selectedMenuId with defaultMenuId when it changes (only if not manually set)
  const activeMenuId = selectedMenuId ?? defaultMenuId;

  const { products, categories, visibleProducts, productCountByCategory, isLoading } =
    useFilteredProducts({
      menuId: multipleMenusEnabled ? activeMenuId : null,
      categoriesEnabled,
    });

  const modifierGroupsEnabled = flags.modifier_groups_enabled ?? false;
  const productModifierGroups = useProductModifierGroupsMap(products);

  const [customizationProduct, setCustomizationProduct] = useState<Product | null>(null);
  const customizationGroups = customizationProduct
    ? (productModifierGroups[customizationProduct.id] ?? [])
    : [];

  const createOrderMutation = useCreateOrder();

  const synchronizedCartItems = currentOrder.map((item) => {
    const currentProduct = products.find((product) => product.id === item.product.id);
    return currentProduct ? { ...item, product: currentProduct } : item;
  });
  const cartTotals = calculateCartTotals(synchronizedCartItems);

  const emptyStateTitle =
    selectedCategory === POS_CATEGORY_FILTER.ALL
      ? t('empty.noProducts')
      : t('empty.noProductsInCategory');
  const emptyStateHint =
    selectedCategory === POS_CATEGORY_FILTER.ALL
      ? t('empty.setupHint')
      : t('empty.changeCategoryHint');

  const handleAddToCart = (product: Product, modifiers?: SelectedModifier[]) => {
    if (modifiers && modifiers.length > 0) {
      addItem(product, modifiers);
      setCustomizationProduct(null);
      toast.success(t('toast.productAdded', { productName: product.name }), {
        description: t('toast.readyToPay'),
      });
      return;
    }

    if (modifierGroupsEnabled) {
      const groups = productModifierGroups[product.id] ?? [];
      if (groups.length > 0) {
        setCustomizationProduct(product);
        return;
      }
    }

    const currentItem = currentOrder.find((item) => item.product.id === product.id);
    addItem(product);
    toast.success(t('toast.productAdded', { productName: product.name }), {
      description: currentItem ? t('toast.quantityUpdated', { quantity: currentItem.quantity + 1 }) : t('toast.readyToPay'),
    });
  };

  const handleCloseCustomizationDialog = () => {
    setCustomizationProduct(null);
  };

  const handleConfirmCustomization = (modifiers: SelectedModifier[]) => {
    if (!customizationProduct) return;
    addItem(customizationProduct, modifiers);
    setCustomizationProduct(null);
    toast.success(t('toast.productAdded', { productName: customizationProduct.name }), {
      description: t('toast.readyToPay'),
    });
  };

  const openCheckout = () => {
    if (synchronizedCartItems.length === 0) {
      return;
    }

    if (shiftManagementEnabled && !activeShift) {
      toast.warning(t('shift:noActiveShiftAlert'));
      return;
    }

    openCheckoutModal();
  };

  const handleConfirmCheckout = async (input: CreateOrderInput) => {
    const orderInput = shiftManagementEnabled && activeShift
      ? { ...input, shiftId: activeShift.id }
      : input;

    const createdOrder = await createOrderMutation.mutateAsync(orderInput);

    const productNameById: Record<string, string> = {};
    for (const item of synchronizedCartItems) {
      productNameById[item.product.id] = item.product.name;
    }

    const printResult = await printOrder({
      ticketNumber: createdOrder.ticketNumber,
      createdAt: createdOrder.createdAt,
      total: createdOrder.total,
      items: input.items.map((item) => {
        const cartItem = synchronizedCartItems.find((c) => c.product.id === item.productId);
        return {
          name: productNameById[item.productId] ?? "Producto",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          modifiers: (cartItem?.selectedModifiers ?? []).map((m) => ({
            groupName: m.groupName,
            optionName: m.optionName,
            textValue: m.textValue,
          })),
        };
      }),
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

    handleClearCart();
    closeCheckoutModal();
    closeMobileCart();

    toast.success(t('toast.orderSaved', { ticketNumber: createdOrder.ticketNumber }), {
      description: createdOrder.customer
        ? t('toast.orderCustomerInfo', { customerName: createdOrder.customer.name, customerPhone: createdOrder.customer.phone })
        : t('toast.orderItemsCount', { itemsCount: cartTotals.itemsCount }),
    });

    printResult.mapErr((printError) => {
      toast.error(t('toast.printError'), {
        description: printError.message,
      });
    });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text">
      <header className="border-b border-border bg-surface select-none" data-tauri-drag-region>
        <div
          className={`relative flex h-11 items-center pr-3 sm:pr-4 ${IS_MAC ? "pl-20" : "pl-4"}`}
          data-tauri-drag-region
        >
          {/* Title — absolute center */}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-base text-text">
            {t('header.title')}
          </span>

          {/* Search + actions — right */}
          <div className="ml-auto flex items-center gap-1.5">
            {shiftManagementEnabled ? (
              <ShiftButton />
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
              className="h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
              aria-label={t('headerActions.settingsAriaLabel')}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileCart}
              className="relative h-7 w-7 rounded-card border border-border text-text-muted hover:border-border-strong hover:bg-surface-sunken hover:text-text lg:hidden"
              aria-label={t('headerActions.cartAriaLabel')}
            >
              <Menu className="h-3.5 w-3.5" />
              {cartTotals.itemsCount > 0 ? (
                <span className="font-mono-tabular absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-sharp bg-primary px-0.5 text-2xs font-bold text-on-primary">
                  {cartTotals.itemsCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-24 lg:pb-0">
          <div className="px-4 pt-3 sm:px-6 lg:px-8">
            <ProductSearch className="w-full" />
          </div>

          {(multipleMenusEnabled && menus.length > 0) || categoriesEnabled ? (
            <div className="px-4 py-3 sm:px-6 lg:px-8">
              {multipleMenusEnabled && menus.length > 0 ? (
                <div>
                  <h2 className="eyebrow mb-2">
                    {t("menu:sectionTitles.menu")}
                  </h2>
                  <MenuSelector
                    menus={menus}
                    selectedMenuId={activeMenuId}
                    onSelect={setSelectedMenuId}
                  />
                </div>
              ) : null}
              {categoriesEnabled ? (
                <div className={multipleMenusEnabled && menus.length > 0 ? "mt-3 -mx-1 px-1 sm:-mx-5 sm:px-5" : "-mx-1 px-1 sm:-mx-5 sm:px-5"}>
                  <h2 className="eyebrow mb-2">
                    {t("menu:sectionTitles.categories")}
                  </h2>
                  <CategoryNav
                    categories={categories}
                    activeCategoryId={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    productCountByCategory={productCountByCategory}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4 sm:px-4 lg:px-6 lg:py-6">
            <h2 className="eyebrow mb-4">
              {t("menu:sectionTitles.products")}
            </h2>
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-card border border-border bg-surface-raised shadow-card"
                    style={{ minHeight: "140px" }}
                  />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <section className="relative flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
                <SearchX className="h-12 w-12 text-text-dim" aria-hidden="true" />
                <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
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
                productModifierGroups={productModifierGroups}
              />
            )}
          </div>
        </section>

        <aside className="hidden w-[30%] min-h-0 min-w-0 overflow-hidden border-l border-border bg-surface-raised lg:block">
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            onClick={openMobileCart}
            className="group relative flex h-16 w-full items-center justify-between overflow-hidden rounded-sharp border border-primary/30 bg-surface-raised px-4 text-text shadow-card hover:border-primary/60"
          >
            <span className="flex items-center gap-3">
              <span className="font-mono-tabular flex h-9 w-9 items-center justify-center rounded-sharp bg-primary text-xs font-bold text-on-primary">
                {String(cartTotals.itemsCount).padStart(2, "0")}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="eyebrow">{t('cart.viewTicket')}</span>
                <span className="mt-1.5 text-base font-bold text-text">{t('cart.yourAccount')}</span>
              </span>
            </span>
            <span className="font-mono-tabular text-lg font-medium tracking-tight text-primary-strong">
              {formatPosCurrency(cartTotals.total)}
            </span>
          </Button>
        </div>
      ) : null}

      {isMobileCartOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t('cart.closeAriaLabel')}
            className="absolute inset-0 bg-scrim/70 backdrop-blur-sm animate-fade-in"
            onClick={closeMobileCart}
          />
          <div className="absolute inset-x-2 bottom-2 top-12 animate-modal-in">
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileCart}
              className="absolute -top-10 right-0 z-10 rounded-sharp border border-border-strong bg-surface-raised text-text"
              aria-label={t('cart.closeButton')}
            >
              <X className="h-4 w-4" />
            </Button>
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
        renderDeliveryPersonSelect={
          deliveryEnabled
            ? ({ value, onChange }) => (
                <DeliveryPersonSelect value={value} onChange={onChange} />
              )
            : undefined
        }
      />

      {isSettingsOpen ? (
        <SettingsModal
          open={isSettingsOpen}
          onClose={closeSettings}
          registry={MODULE_REGISTRY}
        />
      ) : null}

      {customizationProduct !== null ? (
        <ProductCustomizationDialog
          product={customizationProduct}
          groups={customizationGroups}
          open={true}
          onConfirm={handleConfirmCustomization}
          onClose={handleCloseCustomizationDialog}
        />
      ) : null}

      <UpdateToast updater={updater} />
    </div>
  );
}
