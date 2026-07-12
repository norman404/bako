import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const createIcon = (name: string) => {
    return React.forwardRef(function Icon(props: any, ref: any) {
      return React.createElement("svg", { ref, "aria-hidden": "true", "data-icon": name, ...props });
    });
  };

  return new Proxy({}, {
    get(target: any, prop: string | symbol) {
      if (prop === "default" || prop === "__esModule" || typeof prop !== "string") {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createIcon(prop);
      }
      return target[prop];
    },
  });
});

import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";
import { ProductGrid } from "@/modules/menu/components/ProductGrid";
import type { Product } from "@/modules/menu/domain/product";
import type { Category } from "@/modules/menu/domain/category";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Bebidas",
    description: "Bebidas frías y calientes",
    color: null,
    menuId: null,
    printerId: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    categoryId: "cat-1",
    menuIds: ["menu-1"],
    name: "Café",
    description: "Café caliente",
    price: 5000,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: "g1",
    name: "Nivel de hielo",
    type: "single",
    required: false,
    sortOrder: 0,
    options: [],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

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
  const onAddToCart = opts.onAddToCart ?? vi.fn();

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
    vi.restoreAllMocks();
    setModifierFlag(true);
  });

  it("shows modifier badge on product card when flag ON and product has effective groups", () => {
    // GIVEN flag ON and product "Café" with effective groups ["g1", "g2"]
    // WHEN ProductGrid renders
    // THEN card displays a modifier badge
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    const groups = [buildGroup({ id: "g1" }), buildGroup({ id: "g2" })];

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
    const groups = [buildGroup({ id: "g1" })];

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
        p1: [buildGroup({ id: "g1" })],
        p2: [buildGroup({ id: "g2" })],
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
        "p-with": [buildGroup({ id: "g1" })],
        "p-without": [],
      },
    });

    expect(screen.getByTestId("modifier-badge-p-with")).toBeInTheDocument();
    expect(screen.queryByTestId("modifier-badge-p-without")).not.toBeInTheDocument();
  });

  it("preserves onAddToCart behavior when flag is ON", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    const onAddToCart = vi.fn();

    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildGroup({ id: "g1" })] },
      onAddToCart,
    });

    fireEvent.click(screen.getByRole("button", { name: /agregar café/i }));
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });
});

describe("ProductGrid modifier badge — refined", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setModifierFlag(true);
  });

  it("uses a lucide icon (SlidersHorizontal) instead of the literal '+' character", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });

    const { container } = renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildGroup({ id: "g1" })] },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    // The badge must contain an SVG icon, not a text "+"
    const svg = badge.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(badge.textContent?.trim()).toBe("");
    // And specifically the icon name
    const iconName = (svg as SVGElement | null)?.getAttribute("data-icon");
    expect(iconName).toBe("SlidersHorizontal");
    // Sanity: the icon was rendered (not just the wrapper)
    expect(container.querySelector('[data-icon="SlidersHorizontal"]')).not.toBeNull();
  });

  it("badge has a non-empty aria-label that names the feature", () => {
    const product = buildProduct({ id: "prod-cafe", name: "Café" });
    renderGrid({
      products: [product],
      productModifierGroups: { "prod-cafe": [buildGroup({ id: "g1" })] },
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
          buildGroup({ id: "g1" }),
          buildGroup({ id: "g2" }),
          buildGroup({ id: "g3" }),
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
      productModifierGroups: { "prod-cafe": [buildGroup({ id: "g1" })] },
    });

    const badge = screen.getByTestId(`modifier-badge-${product.id}`);
    expect(badge).not.toHaveAttribute("data-group-count");
  });
});