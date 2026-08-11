import { describe, expect, it } from "bun:test";

import { Badge } from "./badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Checkbox } from "./checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { renderWithProviders, screen } from "@/test/test-utils";

function expectDataSlot(element: Element, slot: string): void {
  expect(element.getAttribute("data-slot")).toBe(slot);
}

describe("surface primitives", () => {
  it("exposes data-slot markers on dialog surfaces", () => {
    // CASE: An open dialog renders its complete composed surface.
    // VALIDATES: Each dialog wrapper exposes the registry data-slot contract.
    // Arrange
    renderWithProviders(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Descripción</DialogDescription>
          </DialogHeader>
          <DialogFooter>Acciones</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Act
    const dialog = screen.getByRole("dialog");

    // Assert
    expectDataSlot(dialog, "dialog-content");
    expectDataSlot(screen.getByRole("heading", { name: "Título" }), "dialog-title");
    expectDataSlot(screen.getByText("Descripción"), "dialog-description");
    expectDataSlot(screen.getByText("Acciones"), "dialog-footer");
    expectDataSlot(dialog.firstElementChild as Element, "dialog-header");
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
  });

  it("should expose the centered layout when no layout is specified", () => {
    // CASE: A standard confirmation dialog uses the primitive without a layout override.
    // VALIDATES: Consumers can target the default centered geometry through the public layout marker.
    // Arrange
    renderWithProviders(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Confirmar</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    // Act
    const dialog = screen.getByRole("dialog", { name: "Confirmar" });

    // Assert
    expect(dialog.getAttribute("data-layout")).toBe("centered");
  });

  it("should expose the fullscreen layout when a consumer requests it", () => {
    // CASE: Checkout needs a viewport-sized dialog that owns its internal modal surface.
    // VALIDATES: The shared primitive selects fullscreen geometry instead of inheriting centered transforms.
    // Arrange
    const fullscreenLayout = { layout: "fullscreen" } as Record<string, unknown>;
    renderWithProviders(
      <Dialog open>
        <DialogContent {...fullscreenLayout}>
          <DialogTitle>Cobro</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    // Act
    const dialog = screen.getByRole("dialog", { name: "Cobro" });

    // Assert
    expect(dialog.getAttribute("data-layout")).toBe("fullscreen");
  });

  it("exposes a data-slot marker on popover content", () => {
    // CASE: An open popover renders content through its portal.
    // VALIDATES: The popover surface exposes data-slot="popover-content".
    // Arrange
    renderWithProviders(
      <Popover open>
        <PopoverTrigger> abrir </PopoverTrigger>
        <PopoverContent>Contenido</PopoverContent>
      </Popover>,
    );

    // Act
    const content = screen.getByText("Contenido");

    // Assert
    expectDataSlot(content, "popover-content");
  });

  it("exposes data-slot markers on select trigger and content", () => {
    // CASE: An open select renders its trigger and option surface.
    // VALIDATES: Select wrappers expose the registry data-slot contract.
    // Arrange
    renderWithProviders(
      <Select open defaultValue="one">
        <SelectTrigger aria-label="Opción">
          <SelectValue placeholder="Elegí" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">Una</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    const trigger = document.querySelector('[role="combobox"]') as Element;
    const content = document.querySelector('[role="listbox"]') as Element;
    const viewport = document.querySelector('[data-radix-select-viewport]') as Element;
    const item = document.querySelector('[role="option"]') as Element;

    // Assert
    expectDataSlot(trigger, "select-trigger");
    expectDataSlot(content, "select-content");
    expectDataSlot(viewport, "select-viewport");
    expectDataSlot(item, "select-item");
  });

  it("exposes a data-slot marker on checkbox root", () => {
    // CASE: A checkbox is rendered as an unchecked form control.
    // VALIDATES: The Radix checkbox root exposes data-slot="checkbox".
    // Arrange
    renderWithProviders(<Checkbox aria-label="Activo" />);

    // Act
    const checkbox = screen.getByRole("checkbox", { name: "Activo" });

    // Assert
    expectDataSlot(checkbox, "checkbox");
  });

  it("exposes a data-slot marker on badge root", () => {
    // CASE: A badge renders a status label.
    // VALIDATES: The badge root exposes data-slot="badge".
    // Arrange
    renderWithProviders(<Badge>Activo</Badge>);

    // Act
    const badge = screen.getByText("Activo");

    // Assert
    expectDataSlot(badge, "badge");
  });
});
