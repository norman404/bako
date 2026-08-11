import { describe, expect, it } from "bun:test";
import { createRef } from "react";

import { renderWithProviders, screen } from "@/test/test-utils";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

describe("Input", () => {
  it("exposes a data-slot marker so shadcn styling hooks can target it", () => {
    // CASE: the shadcn convention identifies primitives by `data-slot`.
    // VALIDATES: the rendered input carries data-slot="input".
    renderWithProviders(<Input />);

    expect(screen.getByRole("textbox").getAttribute("data-slot")).toBe("input");
  });

  it("renders an accessible text input", () => {
    // CASE: the plain, prop-less render.
    // VALIDATES: an <input> reachable by its textbox role.
    renderWithProviders(<Input />);

    expect(screen.getByRole("textbox").tagName).toBe("INPUT");
  });

  it("merges a custom class with the base classes", () => {
    // CASE: a consumer flags a validation error with `border-danger`.
    // VALIDATES: cn() keeps the custom token AND the non-conflicting base classes.
    renderWithProviders(<Input className="border-danger" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-danger");
    expect(input).toHaveClass("h-9");
    expect(input).toHaveClass("rounded-card");
    expect(input).toHaveClass("bg-surface-raised");
  });

  it("reflects the disabled attribute", () => {
    // CASE: a form disables the field while a mutation is in flight.
    // VALIDATES: the native disabled attribute reaches the DOM element.
    renderWithProviders(<Input disabled />);

    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("forwards the ref to the DOM element", () => {
    // CASE: a consumer needs imperative focus.
    // VALIDATES: ref.current is the real <input> node.
    const ref = createRef<HTMLInputElement>();

    renderWithProviders(<Input ref={ref} />);

    expect(ref.current).toBe(screen.getByRole("textbox") as HTMLInputElement);
  });

  it("spreads arbitrary props onto the element", () => {
    // CASE: consumers pass through test ids, aria labels and placeholders.
    // VALIDATES: unknown props are not swallowed by the wrapper.
    renderWithProviders(
      <Input data-testid="amount-input" aria-label="Monto" placeholder="0.00" />,
    );

    const input = screen.getByTestId("amount-input");
    expect(input).toHaveAttribute("aria-label", "Monto");
    expect(input).toHaveAttribute("placeholder", "0.00");
  });
});

describe("Textarea", () => {
  it("exposes a data-slot marker so shadcn styling hooks can target it", () => {
    // CASE: the shadcn convention identifies primitives by `data-slot`.
    // VALIDATES: the rendered textarea carries data-slot="textarea".
    renderWithProviders(<Textarea />);

    expect(screen.getByRole("textbox").getAttribute("data-slot")).toBe("textarea");
  });

  it("renders an accessible textarea", () => {
    // CASE: the plain, prop-less render.
    // VALIDATES: a <textarea> reachable by its textbox role.
    renderWithProviders(<Textarea />);

    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });

  it("merges a custom class with the base classes", () => {
    // CASE: a consumer flags a validation error with `border-danger`.
    // VALIDATES: cn() keeps the custom token AND the non-conflicting base classes.
    renderWithProviders(<Textarea className="border-danger" />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("border-danger");
    expect(textarea).toHaveClass("rounded-card");
    expect(textarea).toHaveClass("bg-surface-raised");
  });

  it("reflects the disabled attribute", () => {
    // CASE: a form disables the field while a mutation is in flight.
    // VALIDATES: the native disabled attribute reaches the DOM element.
    renderWithProviders(<Textarea disabled />);

    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("forwards the ref to the DOM element", () => {
    // CASE: a consumer needs imperative focus.
    // VALIDATES: ref.current is the real <textarea> node.
    const ref = createRef<HTMLTextAreaElement>();

    renderWithProviders(<Textarea ref={ref} />);

    expect(ref.current).toBe(screen.getByRole("textbox") as HTMLTextAreaElement);
  });

  it("spreads arbitrary props onto the element", () => {
    // CASE: consumers pass through test ids, aria labels and placeholders.
    // VALIDATES: unknown props are not swallowed by the wrapper.
    renderWithProviders(
      <Textarea data-testid="notes-textarea" aria-label="Notas" placeholder="Comentarios" />,
    );

    const textarea = screen.getByTestId("notes-textarea");
    expect(textarea).toHaveAttribute("aria-label", "Notas");
    expect(textarea).toHaveAttribute("placeholder", "Comentarios");
  });
});

describe("Label", () => {
  it("exposes a data-slot marker so shadcn styling hooks can target it", () => {
    // CASE: the shadcn convention identifies primitives by `data-slot`.
    // VALIDATES: the rendered label carries data-slot="label".
    renderWithProviders(<Label data-testid="field-label">Nombre</Label>);

    expect(screen.getByTestId("field-label").getAttribute("data-slot")).toBe("label");
  });

  it("associates the label with its control via htmlFor", () => {
    // CASE: FormField renders <Label htmlFor> next to a control sharing that id.
    // VALIDATES: getByLabelText resolves the control through the association.
    renderWithProviders(
      <>
        <Label htmlFor="product-name">Nombre</Label>
        <Input id="product-name" />
      </>,
    );

    expect(screen.getByLabelText("Nombre")).toBe(screen.getByRole("textbox") as HTMLElement);
  });

  it("merges a custom class with the base classes", () => {
    // CASE: a consumer tweaks spacing on a label.
    // VALIDATES: cn() keeps the custom class AND the labelVariants base classes.
    renderWithProviders(
      <Label data-testid="field-label" className="mb-2">
        Nombre
      </Label>,
    );

    const label = screen.getByTestId("field-label");
    expect(label).toHaveClass("mb-2");
    expect(label).toHaveClass("text-2xs");
    expect(label).toHaveClass("uppercase");
  });

  it("forwards the ref to the DOM element", () => {
    // CASE: a consumer measures the label node.
    // VALIDATES: ref.current is the real <label> node.
    const ref = createRef<HTMLLabelElement>();

    renderWithProviders(
      <Label ref={ref} data-testid="field-label">
        Nombre
      </Label>,
    );

    expect(ref.current).toBe(screen.getByTestId("field-label") as HTMLLabelElement);
  });

  it("spreads arbitrary props onto the element", () => {
    // CASE: consumers pass through test ids and aria attributes.
    // VALIDATES: unknown props are not swallowed by the wrapper.
    renderWithProviders(
      <Label data-testid="field-label" aria-label="Etiqueta de nombre">
        Nombre
      </Label>,
    );

    expect(screen.getByTestId("field-label")).toHaveAttribute(
      "aria-label",
      "Etiqueta de nombre",
    );
  });
});
