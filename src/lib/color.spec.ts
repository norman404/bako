import { describe, expect, it } from "vitest";

import { categoryAccent } from "./color";

const FALLBACK = {
  bg: "#24273A",
  border: "#363A4F",
  text: "#CAD3F5",
};

describe("categoryAccent", () => {
  it("mixes a 6-digit hex at 20% with the dark surface for the background", () => {
    const accent = categoryAccent("#3B82F6");

    expect(accent.bg).toBe("color-mix(in srgb, #3B82F6 20%, #24273A)");
  });

  it("mixes the hex at 55% with the theme border color for the border", () => {
    const accent = categoryAccent("#3B82F6");

    expect(accent.border).toBe("color-mix(in srgb, #3B82F6 55%, #363A4F)");
  });

  it("mixes the hex at 60% with the light theme text in oklch for the text", () => {
    const accent = categoryAccent("#3B82F6");

    expect(accent.text).toBe("color-mix(in oklch, #3B82F6 60%, #CAD3F5)");
  });

  it("accepts 3-digit hex shorthand", () => {
    const accent = categoryAccent("#F60");

    expect(accent).toEqual({
      bg: "color-mix(in srgb, #F60 20%, #24273A)",
      border: "color-mix(in srgb, #F60 55%, #363A4F)",
      text: "color-mix(in oklch, #F60 60%, #CAD3F5)",
    });
  });

  it("trims surrounding whitespace before mixing", () => {
    const accent = categoryAccent("  #3B82F6  ");

    expect(accent.bg).toBe("color-mix(in srgb, #3B82F6 20%, #24273A)");
  });

  it("falls back to theme neutrals for an empty string", () => {
    expect(categoryAccent("")).toEqual(FALLBACK);
  });

  it("falls back to theme neutrals for a hex without #", () => {
    expect(categoryAccent("3B82F6")).toEqual(FALLBACK);
  });

  it("falls back to theme neutrals for non-hex garbage", () => {
    expect(categoryAccent("tomato")).toEqual(FALLBACK);
    expect(categoryAccent("#GGHHII")).toEqual(FALLBACK);
    expect(categoryAccent("#12345")).toEqual(FALLBACK);
  });
});
