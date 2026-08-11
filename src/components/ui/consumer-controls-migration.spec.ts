import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SOURCE_ROOT = join(import.meta.dir, "..", "..");

const PRIMITIVE_IMPLEMENTATIONS = new Set([
  "components/ui/button.tsx",
  "components/ui/input.tsx",
  "components/ui/textarea.tsx",
]);

const FORM_CONTROL_PATTERN = /<(?:input|select|textarea|label)\b/g;
const ACTION_CONTROL_PATTERN = /<button\b/g;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".spec.")) return [];
    return [path];
  });
}

function rawControlViolations(pattern: RegExp): string[] {
  return listSourceFiles(SOURCE_ROOT).flatMap((path) => {
    const sourcePath = relative(SOURCE_ROOT, path);
    if (PRIMITIVE_IMPLEMENTATIONS.has(sourcePath)) return [];

    const tags = readFileSync(path, "utf8").match(pattern) ?? [];
    return tags.length > 0 ? [`${sourcePath}: ${tags.join(", ")}`] : [];
  });
}

describe("consumer control migration", () => {
  it("should route form controls through shared UI primitives", () => {
    // CASE: Application forms render fields outside the primitive implementation directory.
    // VALIDATES: Consumers use Input, Select, Checkbox and Label instead of parallel native controls.
    // Arrange
    const violations = rawControlViolations(FORM_CONTROL_PATTERN);

    // Act
    const result = violations;

    // Assert
    expect(result).toEqual([]);
  });

  it("should route action controls through the shared Button primitive", () => {
    // CASE: Application surfaces expose actions outside the Button primitive implementation.
    // VALIDATES: Consumers share Button semantics instead of styling native buttons independently.
    // Arrange
    const violations = rawControlViolations(ACTION_CONTROL_PATTERN);

    // Act
    const result = violations;

    // Assert
    expect(result).toEqual([]);
  });
});
