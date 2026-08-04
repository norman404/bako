import { beforeEach, describe, expect, it } from "bun:test";

import {
  consumeDatabaseRestoreFailure,
  recordDatabaseRestoreFailure,
} from "./database-restore-notice";

describe("database restore failure notice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists a failure notice until the next startup consumes it", () => {
    // CASE: restore fails after the database connection was closed.
    // VALIDATES: the next application start can show persistent feedback.
    recordDatabaseRestoreFailure();

    expect(consumeDatabaseRestoreFailure()).toBe(true);
    expect(consumeDatabaseRestoreFailure()).toBe(false);
  });
});
