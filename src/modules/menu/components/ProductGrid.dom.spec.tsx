import { describe, expect, it, mock, beforeEach } from "bun:test";



import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";
import type { Product } from "@/modules/menu/domain/product";
import type { Category } from "@/modules/menu/domain/category";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { buildCategory, buildModifierGroup, buildProduct } from "@/modules/menu/test/factories";

// Import dinámico DESPUÉS de mock.module: en bun los imports estáticos se evalúan
// antes del cuerpo del módulo, y mock.module no re-parchea bindings ya evaluados.
const { ProductGrid } = await import("@/modules/menu/components/ProductGrid");

function setModifierFlag(value: boolean) {
  useFeatureFlagsStore.setState({
    flags: { ...useFeatureFlagsStore.getState().flags, modifier_groups_enabled: value },
  });
}

function renderGrid(opts: {
  products?: Product[];
  categories?: Category[];
  productModifierGroups?: Record<string, ModifierGroup[]>;
  onAddToCart?: (product: Product) => void;
} = {}) {
  const products = opts.products ?? [buildProduct()];
  const categories = opts.categories ?? [buildCategory()];
  const productModifierGroups = opts.productModifierGroups ?? {};
  const onAddToCart = opts.onAddToCart ?? mock();

  return renderWithProviders(
    <ProductGrid
      products={products}
      categories={categories}
      activeCategoryId="all"
      onAddToCart={onAddToCart}
      productModifierGroups={productModifierGroups}
    />,
  );
}

describe("ProductGrid modifier badge", () => {
  beforeEach(() => {
    mock.restore();
    setModifierFlag(true);
  });

  it("shows modifier badge on product card when flag ON and product has effective groups", () => {
    // GIVEN flag ON and product "Café" with effective groups ["g1", "g2"]
    // WHEN ProductGrid renders
    // THEN card displays a modifier badge
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    const groups = [buildModifierGroup({ id: "g1" }), buildModifierGroup({ id: "g2" })];

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": groups },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    expect(badge).toBeInTheDocument();
  });

  it("hides modifier badge when product has no effective groups", () => {
    // GIVEN flag ON and product "Té" with empty effective groups
    // WHEN ProductGrid renders card for "Té"
    // THEN no badge displayed
    const product = buildProduct({ id: "prod-te", name: "Té" });

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-te": [] },
    });

    expect(screen.queryByTestId(`modifier-badge-${product.id}`)).not.toBeInTheDocument();
  });

  it("hides modifier badge when flag is OFF even if product has groups", () => {
    // GIVEN flag OFF and product "Café" with effective groups ["g1"]
    // WHEN ProductGrid renders
    // THEN no badge displayed
    setModifierFlag(false);
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    const groups = [buildModifierGroup({ id: "g1" })];

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": groups },
    });

    expect(screen.queryByTestId(`modifier-badge-${product.id}`)).not.toBeInTheDocument();
  });

  it("hides badge for all products when flag is OFF", () => {
    setModifierFlag(false);
    const p1 = buildProduct({ id: "p1", name: "Café" });
    const p2 = buildProduct({ id: "p2", name: "Té" });

    renderGrid({
      products: [p1, p2],
      productModifierGroups: {
        p1: [buildModifierGroup({ id: "g1" })],
        p2: [buildModifierGroup({ id: "g2" })],
      },
    });

    expect(screen.queryByTestId("modifier-badge-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modifier-badge-p2")).not.toBeInTheDocument();
  });

  it("shows badge only on products with groups, not on those without (mixed)", () => {
    const withGroups = buildProduct({ id: "p-with", name: "Café" });
    const withoutGroups = buildProduct({ id: "p-without", name: "Té" });

    renderGrid({
      products: [withGroups, withoutGroups],
      productModifierGroups: {
        "p-with": [buildModifierGroup({ id: "g1" })],
        "p-without": [],
      },
    });

    expect(screen.getByTestId("modifier-badge-p-with")).toBeInTheDocument();
    expect(screen.queryByTestId("modifier-badge-p-without")).not.toBeInTheDocument();
  });

  it("preserves onAddToCart behavior when flag is ON", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    const onAddToCart = mock();

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildModifierGroup({ id: "g1" })] },
      onAddToCart,
    });

    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });
});

describe("ProductGrid modifier badge — refined", () => {
  beforeEach(() => {
    mock.restore();
    setModifierFlag(true);
  });

  it("uses a lucide icon instead of the literal '+' character", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildModifierGroup({ id: "g1" })] },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    // The badge must contain an SVG icon, not a text "+"
    const svg = badge.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(badge.textContent?.trim()).toBe("");
  });

  it("badge has a non-empty aria-label that names the feature", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildModifierGroup({ id: "g1" })] },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    const ariaLabel = badge.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.toLowerCase()).toMatch(/personaliz|customiz/);
  });

  it("badge shows a numeric count when the product has multiple modifier groups", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    renderGrid({
      products: [product],
      productModifierGroups: {
        "prod-cafe": [
          buildModifierGroup({ id: "g1" }),
          buildModifierGroup({ id: "g2" }),
          buildModifierGroup({ id: "g3" }),
        ],
      },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    // The badge exposes a numeric count (3 groups → "+3")
    expect(badge).toHaveAttribute("data-group-count", "3");
  });

  it("badge does NOT show a count for a single modifier group", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildModifierGroup({ id: "g1" })] },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    expect(badge).not.toHaveAttribute("data-group-count");
  });
});