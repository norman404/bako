import { describe, expect, it, mock } from "bun:test";

import { Button } from "./button";
import { Switch } from "./switch";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

describe("Button", () => {
  it("should expose its primitive slot and native button semantics by default", () => {
    // CASE: A consumer renders a regular action button without special composition.
    // VALIDATES: The shared primitive is identifiable and remains a non-submit button by default.
    // Arrange
    renderWithProviders(<Button>Guardar</Button>);

    // Act
    const button = screen.getByRole("button", { name: "Guardar" });

    // Assert
    expect(button.getAttribute("data-slot")).toBe("button");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("should preserve child semantics when composed with asChild", () => {
    // CASE: A consumer needs button styling on a navigation link.
    // VALIDATES: asChild decorates the link without replacing its link semantics.
    // Arrange
    renderWithProviders(
      <Button asChild>
        <a href="/orders">Ver pedidos</a>
      </Button>,
    );

    // Act
    const link = screen.getByRole("link", { name: "Ver pedidos" });

    // Assert
    expect(link.getAttribute("data-slot")).toBe("button");
    expect(link.getAttribute("href")).toBe("/orders");
  });
});

describe("Switch", () => {
  it("should expose the switch slot and notify the next checked state", () => {
    // CASE: An operator enables a setting that is currently disabled.
    // VALIDATES: The control keeps switch semantics and reports true after one activation.
    // Arrange
    const onCheckedChange = mock();
    renderWithProviders(
      <Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Actualizaciones automáticas" />,
    );

    // Act
    const control = screen.getByRole("switch", { name: "Actualizaciones automáticas" });
    fireEvent.click(control);

    // Assert
    expect(control.getAttribute("data-slot")).toBe("switch");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("should remain inactive when disabled", () => {
    // CASE: A setting is temporarily unavailable while another operation is pending.
    // VALIDATES: A disabled switch does not notify a state change.
    // Arrange
    const onCheckedChange = mock();
    renderWithProviders(
      <Switch checked={true} onCheckedChange={onCheckedChange} disabled aria-label="Actualizaciones automáticas" />,
    );

    // Act
    const control = screen.getByRole("switch", { name: "Actualizaciones automáticas" });
    fireEvent.click(control);

    // Assert
    expect(control.getAttribute("data-slot")).toBe("switch");
    expect(control).toBeDisabled();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
