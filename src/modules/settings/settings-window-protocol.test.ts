import { describe, expect, it } from "vitest";

import { isSettingsRpcRequest } from "./settings-window-protocol";

const UPDATE_SHIFT_LIST_ORDER = "update-shift-list-order";

function makeRequest(value: unknown): unknown {
  return {
    id: "request-1",
    operation: UPDATE_SHIFT_LIST_ORDER,
    payload: { shiftListOrder: value },
  };
}

describe("settings window shift list order contract", () => {
  // CASE: The settings window sends the ascending option selected by the operator.
  // VALIDATES: The RPC request guard accepts the ascending list-order value.
  it("should accept the ascending value in the update request", () => {
    // Arrange
    const request = makeRequest("ascending");

    // Act
    const result = isSettingsRpcRequest(request);

    // Assert
    expect(result).toBe(true);
  });

  // CASE: The settings window sends the descending option selected by the operator.
  // VALIDATES: The RPC request guard accepts the descending list-order value.
  it("should accept the descending value in the update request", () => {
    // Arrange
    const request = makeRequest("descending");

    // Act
    const result = isSettingsRpcRequest(request);

    // Assert
    expect(result).toBe(true);
  });

  // CASE: A malformed child window sends an unsupported list-order value.
  // VALIDATES: The RPC request guard rejects values outside the public contract.
  it("should reject an unsupported value in the update request", () => {
    // Arrange
    const request = makeRequest("sideways");

    // Act
    const result = isSettingsRpcRequest(request);

    // Assert
    expect(result).toBe(false);
  });
});
