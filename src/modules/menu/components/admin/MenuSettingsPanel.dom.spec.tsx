import { describe, expect, it, vi } from "vitest";

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

import * as menuHooks from "@/modules/menu/hooks/use-menus";
import { MenuSettingsPanel } from "@/modules/menu/components/admin/MenuSettingsPanel";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type CreateMenuResult = ReturnType<typeof menuHooks.useCreateMenu>;
type UpdateMenuResult = ReturnType<typeof menuHooks.useUpdateMenu>;
type DeleteMenuResult = ReturnType<typeof menuHooks.useDeleteMenu>;

type MenuSettingsPanelProps = Parameters<typeof MenuSettingsPanel>[0];

const BASE_MENUS = [
  {
    id: "menu-1",
    name: "Menú Principal",
    isDefault: true,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  },
  {
    id: "menu-2",
    name: "Menú de Bebidas",
    isDefault: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  },
] as const;

function mockMenuMutations() {
  vi.spyOn(menuHooks, "useCreateMenu").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as CreateMenuResult);

  vi.spyOn(menuHooks, "useUpdateMenu").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as UpdateMenuResult);

  vi.spyOn(menuHooks, "useDeleteMenu").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as DeleteMenuResult);
}

function renderMenuSettingsPanel(overrides: Partial<MenuSettingsPanelProps> = {}) {
  renderWithProviders(
    <MenuSettingsPanel menus={overrides.menus ?? [...BASE_MENUS]} />,
  );
}

describe("MenuSettingsPanel", () => {
  it("should render list of menus", () => {
    // CASE: menus are already loaded
    // VALIDATES: panel displays menus with name and default indicator
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel();

    // Assert
    expect(screen.getByText("Menú Principal")).toBeInTheDocument();
    expect(screen.getByText("Menú de Bebidas")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument(); // Default badge
  });

  it("should show form to create new menu", () => {
    // CASE: operator wants to create a menu
    // VALIDATES: panel shows form in create mode
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel();

    // Act
    const createButton = screen.getAllByRole("button", { name: /crear menú/i })[0];
    if (createButton) {
      fireEvent.click(createButton);
    }

    // Assert
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
  });

  it("should select menu to edit", () => {
    // CASE: operator selects a menu to edit
    // VALIDATES: form populates with menu data
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel();

    // Act
    fireEvent.click(screen.getByText("Menú de Bebidas"));

    // Assert
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Menú de Bebidas");
  });

  it("should show default indicator", () => {
    // CASE: menu is marked as default
    // VALIDATES: default badge is visible
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel();

    // Assert
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("should disable delete button for default menu", () => {
    // CASE: operator tries to delete default menu
    // VALIDATES: delete button is disabled for default menu
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel();

    // Act & Assert
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
    // First button should be disabled (default menu)
    expect(deleteButtons[0]).toBeDisabled();
    // Second button should be enabled (non-default menu)
    expect(deleteButtons[1]).toBeEnabled();
  });

  it("should show empty state when no menus", () => {
    // CASE: no menus exist
    // VALIDATES: empty state message is shown
    mockMenuMutations();

    // Arrange
    renderMenuSettingsPanel({ menus: [] });

    // Assert
    expect(screen.getByText(/no hay menús/i)).toBeInTheDocument();
  });
});
