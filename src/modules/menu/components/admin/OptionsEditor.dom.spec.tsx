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
      if (prop === "default" || prop === "__esModule" || typeof prop !== "string") {
        return target[prop];
      }
      if (!target[prop]) target[prop] = createIcon(prop);
      return target[prop];
    },
  });
});

import { fireEvent, renderWithProviders, screen, within } from "@/test/test-utils";
import {
  OptionsEditor,
  type OptionsEditorOption,
  type OptionsEditorProps,
} from "@/modules/menu/components/admin/OptionsEditor";

function buildOption(overrides: Partial<OptionsEditorOption> = {}): OptionsEditorOption {
  return {
    name: "",
    priceDelta: 0,
    isDefault: false,
    sortOrder: 0,
    ...overrides,
  };
}

function renderEditor(props: Partial<OptionsEditorProps> = {}) {
  const defaultProps: OptionsEditorProps = {
    options: [],
    onChange: vi.fn(),
    groupKind: "single",
  };
  return renderWithProviders(<OptionsEditor {...defaultProps} {...props} />);
}

describe("OptionsEditor", () => {
  describe("empty state", () => {
    it("renders the editor region with an 'add option' button", () => {
      renderEditor();
      expect(screen.getByTestId("options-editor")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /agregar opción|añadir opción/i })).toBeInTheDocument();
    });

    it("shows a hint when there are no options", () => {
      renderEditor();
      expect(screen.getByTestId("options-empty-hint")).toBeInTheDocument();
    });
  });

  describe("add option", () => {
    it("appends a new empty option when the add button is clicked", () => {
      const onChange = vi.fn();
      renderEditor({ options: [], onChange });

      fireEvent.click(screen.getByRole("button", { name: /agregar opción|añadir opción/i }));

      expect(onChange).toHaveBeenCalledTimes(1);
      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next).toHaveLength(1);
      expect(next[0]).toMatchObject({ name: "", priceDelta: 0, isDefault: false });
    });
  });

  describe("remove option", () => {
    it("removes the option at the given index", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", sortOrder: 0 }),
        buildOption({ name: "B", sortOrder: 1 }),
        buildOption({ name: "C", sortOrder: 2 }),
      ];
      renderEditor({ options: initial, onChange });

      // Click remove on the second option (index 1)
      const rows = screen.getAllByTestId(/^option-row-/);
      expect(rows).toHaveLength(3);
      const removeBtn = within(rows[1]).getByRole("button", { name: /eliminar|quitar/i });
      fireEvent.click(removeBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next).toHaveLength(2);
      expect(next.map((o) => o.name)).toEqual(["A", "C"]);
    });
  });

  describe("reorder", () => {
    it("moves the option up when the up button is clicked", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", sortOrder: 0 }),
        buildOption({ name: "B", sortOrder: 1 }),
        buildOption({ name: "C", sortOrder: 2 }),
      ];
      renderEditor({ options: initial, onChange });

      const rows = screen.getAllByTestId(/^option-row-/);
      const upBtn = within(rows[1]).getByRole("button", { name: /subir|↑/i });
      fireEvent.click(upBtn);

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next.map((o) => o.name)).toEqual(["B", "A", "C"]);
    });

    it("moves the option down when the down button is clicked", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", sortOrder: 0 }),
        buildOption({ name: "B", sortOrder: 1 }),
        buildOption({ name: "C", sortOrder: 2 }),
      ];
      renderEditor({ options: initial, onChange });

      const rows = screen.getAllByTestId(/^option-row-/);
      const downBtn = within(rows[1]).getByRole("button", { name: /bajar|↓/i });
      fireEvent.click(downBtn);

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next.map((o) => o.name)).toEqual(["A", "C", "B"]);
    });

    it("disables the up button on the first row", () => {
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", sortOrder: 0 }),
        buildOption({ name: "B", sortOrder: 1 }),
      ];
      renderEditor({ options: initial });

      const rows = screen.getAllByTestId(/^option-row-/);
      const upBtn = within(rows[0]).getByRole("button", { name: /subir|↑/i });
      expect(upBtn).toBeDisabled();
    });

    it("disables the down button on the last row", () => {
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", sortOrder: 0 }),
        buildOption({ name: "B", sortOrder: 1 }),
      ];
      renderEditor({ options: initial });

      const rows = screen.getAllByTestId(/^option-row-/);
      const downBtn = within(rows[rows.length - 1]).getByRole("button", { name: /bajar|↓/i });
      expect(downBtn).toBeDisabled();
    });
  });

  describe("field updates", () => {
    it("updates the name field of an option", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [buildOption({ name: "" })];
      renderEditor({ options: initial, onChange });

      const input = screen.getByLabelText(/nombre de la opción/i);
      fireEvent.input(input, { target: { value: "Sin azúcar" } });

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next[0].name).toBe("Sin azúcar");
    });

    it("updates the priceDelta field of an option", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [buildOption({ priceDelta: 0 })];
      renderEditor({ options: initial, onChange });

      const input = screen.getByLabelText(/precio adicional/i);
      fireEvent.input(input, { target: { value: "500" } });

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next[0].priceDelta).toBe(500);
    });

    it("updates the isDefault toggle of an option", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [buildOption({ isDefault: false })];
      renderEditor({ options: initial, onChange });

      const input = screen.getByLabelText(/por defecto/i);
      fireEvent.click(input);

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next[0].isDefault).toBe(true);
    });
  });

  describe("default exclusivity for single/single_text", () => {
    it("toggling default on one option unsets default on the others", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", isDefault: true, sortOrder: 0 }),
        buildOption({ name: "B", isDefault: false, sortOrder: 1 }),
      ];
      renderEditor({ options: initial, groupKind: "single", onChange });

      const rows = screen.getAllByTestId(/^option-row-/);
      const bToggle = within(rows[1]).getByLabelText(/por defecto/i);
      fireEvent.click(bToggle);

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next.find((o) => o.name === "A")?.isDefault).toBe(false);
      expect(next.find((o) => o.name === "B")?.isDefault).toBe(true);
    });

    it("does NOT enforce exclusivity for multiple groups", () => {
      const onChange = vi.fn();
      const initial: OptionsEditorOption[] = [
        buildOption({ name: "A", isDefault: true, sortOrder: 0 }),
        buildOption({ name: "B", isDefault: false, sortOrder: 1 }),
      ];
      renderEditor({ options: initial, groupKind: "multiple", onChange });

      const rows = screen.getAllByTestId(/^option-row-/);
      const bToggle = within(rows[1]).getByLabelText(/por defecto/i);
      fireEvent.click(bToggle);

      const next = (onChange.mock.calls[0][0] as OptionsEditorOption[]);
      expect(next.find((o) => o.name === "A")?.isDefault).toBe(true);
      expect(next.find((o) => o.name === "B")?.isDefault).toBe(true);
    });
  });
});
