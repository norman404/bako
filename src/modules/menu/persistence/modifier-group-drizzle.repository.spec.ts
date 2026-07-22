import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import type {
  ModifierAssignmentInput,
  ModifierGroupUpsertInput,
} from "@/modules/menu/domain/ports";
import type {
  CategoryModifierGroupRow,
  ModifierGroupRow,
  ModifierOptionRow,
  ProductModifierGroupRow,
} from "@/shared/db/schema";

const dbMocks = (() => {
  const selectMock = mock<any>();

  const insertReturningMock = mock<any>(() => Promise.resolve([]));
  const insertValuesMock = mock<any>(() => ({ returning: insertReturningMock }));
  const insertMock = mock(() => ({ values: insertValuesMock }));

  const updateReturningMock = mock<any>(() => Promise.resolve([]));
  const updateWhereMock = mock(() => ({ returning: updateReturningMock }));
  const updateSetMock = mock<any>(() => ({ where: updateWhereMock }));
  const updateMock = mock(() => ({ set: updateSetMock }));

  const deleteWhereMock = mock<any>(() => Promise.resolve());
  const deleteMock = mock(() => ({ where: deleteWhereMock }));

  return {
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    updateMock,
    deleteWhereMock,
    deleteMock,
  };
})();

mock.module("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
    delete: dbMocks.deleteMock,
  },
}));

import { ModifierGroupNotFoundError } from "@/modules/menu/domain/errors";
import { modifierGroupDrizzleRepository } from "@/modules/menu/persistence/modifier-group-drizzle.repository";

const now = new Date("2026-01-01T10:00:00.000Z");

function buildGroupRow(overrides: Partial<ModifierGroupRow> = {}): ModifierGroupRow {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Nivel de hielo",
    type: overrides.type ?? "single",
    required: overrides.required ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    firstOptionFree: overrides.firstOptionFree ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  };
}

function buildOptionRow(overrides: Partial<ModifierOptionRow> = {}): ModifierOptionRow {
  return {
    id: overrides.id ?? "option-1",
    groupId: overrides.groupId ?? "group-1",
    name: overrides.name ?? "Sin hielo",
    priceDelta: overrides.priceDelta ?? 0,
    isDefault: overrides.isDefault ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  };
}

function validInput(): ModifierGroupUpsertInput {
  return {
    name: "Nivel de hielo",
    type: "single",
    required: false,
    sortOrder: 0,
    options: [
      { name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 },
      { name: "Poco hielo", priceDelta: 0, isDefault: false, sortOrder: 1 },
      { name: "Normal", priceDelta: 0, isDefault: false, sortOrder: 2 },
    ],
  };
}

// Helper: build a select chain that resolves to a promise of rows
function selectChain(rows: unknown) {
  return {
    from: () => ({
      where: () => ({
        orderBy: mock(() => Promise.resolve(rows)),
        limit: mock(() => Promise.resolve(rows)),
      }),
    }),
  };
}

// Helper: select({ col }).from().where() → Promise (used for assignment lookups)
function selectColumnChain(rows: unknown) {
  return {
    from: () => ({
      where: mock(() => Promise.resolve(rows)),
    }),
  };
}

describe("modifierGroupDrizzleRepository", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    dbMocks.insertReturningMock.mockResolvedValue([]);
    dbMocks.updateReturningMock.mockResolvedValue([]);
    dbMocks.deleteWhereMock.mockResolvedValue(undefined);
  });

  // ---------- 3.1.1 create() ----------

  it("create inserts group row then option rows and returns the assembled group", async () => {
    const generatedId = "11111111-1111-4111-8111-111111111111";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const groupRow = buildGroupRow({ id: generatedId });
    dbMocks.insertReturningMock.mockResolvedValueOnce([groupRow]);

    const result = await modifierGroupDrizzleRepository.create(validInput());

    expect(randomUuidSpy).toHaveBeenCalledTimes(4); // 1 group + 3 options
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    // Insert #1 = group, Insert #2 = options array
    expect(dbMocks.insertMock).toHaveBeenCalledTimes(2);

    const insertedGroup = dbMocks.insertValuesMock.mock.calls[0]![0] as ModifierGroupRow;
    expect(insertedGroup.id).toBe(generatedId);
    expect(insertedGroup.name).toBe("Nivel de hielo");
    expect(insertedGroup.type).toBe("single");
    expect(insertedGroup.required).toBe(false);
    expect(insertedGroup.sortOrder).toBe(0);
    expect("deletedAt" in insertedGroup).toBe(false);

    const insertedOptions = dbMocks.insertValuesMock.mock.calls[1]![0] as ModifierOptionRow[];
    expect(insertedOptions).toHaveLength(3);
    expect(insertedOptions[0].name).toBe("Sin hielo");
    expect(insertedOptions[0].isDefault).toBe(true);
    expect(insertedOptions[0].groupId).toBe(generatedId);

    expect(result.value.id).toBe(generatedId);
    expect(result.value.options).toHaveLength(3);
    expect(result.value.options[0].isDefault).toBe(true);
    expect(result.value.deletedAt).toBeNull();

    randomUuidSpy.mockRestore();
  });

  it("create triangulates: a group with a single option is persisted correctly", async () => {
    const generatedId = "22222222-2222-4222-8222-222222222222";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const groupRow = buildGroupRow({ id: generatedId, name: "Comentarios", type: "text", required: true });
    dbMocks.insertReturningMock.mockResolvedValueOnce([groupRow]);

    const result = await modifierGroupDrizzleRepository.create({
      name: "Comentarios",
      type: "text",
      required: true,
      sortOrder: 1,
      options: [{ name: "N/A", priceDelta: 0, isDefault: false, sortOrder: 0 }],
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    const insertedOptions = dbMocks.insertValuesMock.mock.calls[1]![0] as ModifierOptionRow[];
    expect(insertedOptions).toHaveLength(1);
    expect(insertedOptions[0].name).toBe("N/A");

    expect(result.value.options).toHaveLength(1);
    expect(result.value.required).toBe(true);

    randomUuidSpy.mockRestore();
  });

  it("create rejects when options array is empty", async () => {
    const result = await modifierGroupDrizzleRepository.create({
      ...validInput(),
      options: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for empty options");
    }
    expect(result.error.message).toContain("at least one option");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  it("create rejects negative priceDelta on an option", async () => {
    const result = await modifierGroupDrizzleRepository.create({
      ...validInput(),
      options: [{ name: "Extra", priceDelta: -100, isDefault: false, sortOrder: 0 }],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for negative priceDelta");
    }
    expect(result.error.message).toContain("non-negative");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  it("create rejects invalid group type", async () => {
    const result = await modifierGroupDrizzleRepository.create({
      ...validInput(),
      type: "dropdown" as never,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for invalid type");
    }
    expect(result.error.message).toContain("type");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  it("create rejects a single group with more than one default option", async () => {
    const result = await modifierGroupDrizzleRepository.create({
      name: "Nivel",
      type: "single",
      required: false,
      sortOrder: 0,
      options: [
        { name: "A", priceDelta: 0, isDefault: true, sortOrder: 0 },
        { name: "B", priceDelta: 0, isDefault: true, sortOrder: 1 },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for multiple defaults on single group");
    }
    expect(result.error.message).toContain("default");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  // ---------- 3.1.2 update() ----------

  it("update replaces options: deletes old options then inserts new ones", async () => {
    const updatedGroupRow = buildGroupRow({ id: "group-1", name: "Hielo", sortOrder: 2 });
    dbMocks.updateReturningMock.mockResolvedValueOnce([updatedGroupRow]);

    const result = await modifierGroupDrizzleRepository.update("group-1", {
      name: "Hielo",
      type: "single",
      required: false,
      sortOrder: 2,
      options: [
        { name: "Poco", priceDelta: 0, isDefault: false, sortOrder: 0 },
        { name: "Normal", priceDelta: 0, isDefault: true, sortOrder: 1 },
      ],
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    // update group, delete old options, insert new options
    expect(dbMocks.updateMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.deleteMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertMock).toHaveBeenCalledTimes(1);

    const insertedOptions = dbMocks.insertValuesMock.mock.calls[0]![0] as ModifierOptionRow[];
    expect(insertedOptions).toHaveLength(2);
    expect(insertedOptions[0].name).toBe("Poco");

    expect(result.value.name).toBe("Hielo");
    expect(result.value.sortOrder).toBe(2);
    expect(result.value.options).toHaveLength(2);
  });

  it("update rejects an archived group (returns ModifierGroupNotFoundError)", async () => {
    dbMocks.updateReturningMock.mockResolvedValueOnce([]);

    const result = await modifierGroupDrizzleRepository.update("archived-group", {
      name: "X",
      type: "single",
      required: false,
      sortOrder: 0,
      options: [{ name: "A", priceDelta: 0, isDefault: false, sortOrder: 0 }],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected update to fail for archived group");
    }
    expect(result.error).toBeInstanceOf(ModifierGroupNotFoundError);
  });

  // ---------- 3.1.3 archive() ----------

  it("archive soft-deletes the group and cascades to options (2 updates)", async () => {
    dbMocks.updateReturningMock.mockResolvedValueOnce([{ id: "group-1" }]);
    dbMocks.updateReturningMock.mockResolvedValueOnce([]);

    const result = await modifierGroupDrizzleRepository.archive("group-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    // Two update calls: group + options cascade
    expect(dbMocks.updateMock).toHaveBeenCalledTimes(2);

    const groupPatch = dbMocks.updateSetMock.mock.calls[0]![0] as {
      deletedAt?: Date | null;
      updatedAt?: Date;
    };
    expect(groupPatch.deletedAt).toBeInstanceOf(Date);
    expect(groupPatch.updatedAt).toBeInstanceOf(Date);

    const optionsPatch = dbMocks.updateSetMock.mock.calls[1]![0] as {
      deletedAt?: Date | null;
      updatedAt?: Date;
    };
    expect(optionsPatch.deletedAt).toBeInstanceOf(Date);
  });

  it("archive returns ModifierGroupNotFoundError when group is not active", async () => {
    dbMocks.updateReturningMock.mockResolvedValueOnce([]);

    const result = await modifierGroupDrizzleRepository.archive("missing");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected archive to fail for missing group");
    }
    expect(result.error).toBeInstanceOf(ModifierGroupNotFoundError);
  });

  it("list excludes archived groups (only active rows returned)", async () => {
    const activeGroup = buildGroupRow({ id: "g1", name: "Active" });
    dbMocks.selectMock.mockReturnValueOnce(selectChain([activeGroup]));

    const optionRows = [buildOptionRow({ id: "opt-1", groupId: "g1" })];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(optionRows));

    const result = await modifierGroupDrizzleRepository.list();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.id).toBe("g1");
    expect(result.value[0]!.deletedAt).toBeNull();
    expect(result.value[0]!.options).toHaveLength(1);
  });

  // ---------- 3.1.4 assign / unassign ----------

  it("assign inserts a row into category_modifier_groups when categoryId provided", async () => {
    const input: ModifierAssignmentInput = {
      groupId: "g1",
      categoryId: "c1",
      productId: null,
    };

    const result = await modifierGroupDrizzleRepository.assign(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(dbMocks.insertMock).toHaveBeenCalledTimes(1);
    const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as CategoryModifierGroupRow;
    expect(inserted.categoryId).toBe("c1");
    expect(inserted.groupId).toBe("g1");
  });

  it("assign inserts a row into product_modifier_groups when productId provided", async () => {
    const result = await modifierGroupDrizzleRepository.assign({
      groupId: "g3",
      categoryId: null,
      productId: "p1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(dbMocks.insertMock).toHaveBeenCalledTimes(1);
    const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as ProductModifierGroupRow;
    expect(inserted.productId).toBe("p1");
    expect(inserted.groupId).toBe("g3");
  });

  it("assign rejects when neither categoryId nor productId is provided", async () => {
    const result = await modifierGroupDrizzleRepository.assign({
      groupId: "g1",
      categoryId: null,
      productId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected assign to fail with no target");
    }
    expect(result.error.message).toContain("at least one");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  it("assign rejects when both categoryId and productId are provided", async () => {
    const result = await modifierGroupDrizzleRepository.assign({
      groupId: "g1",
      categoryId: "c1",
      productId: "p1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected assign to fail with both targets");
    }
    expect(result.error.message).toContain("exactly one");
    expect(dbMocks.insertMock).not.toHaveBeenCalled();
  });

  it("assign propagates DB error (duplicate PK) as a MenuDomainError", async () => {
    dbMocks.insertValuesMock.mockImplementationOnce(() => {
      throw new Error("UNIQUE constraint failed: category_modifier_groups.PRIMARY");
    });

    const result = await modifierGroupDrizzleRepository.assign({
      groupId: "g1",
      categoryId: "c1",
      productId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected assign to fail on duplicate");
    }
    expect(result.error.message).toContain("Failed to assign");
  });

  it("unassign removes the row from category_modifier_groups", async () => {
    const result = await modifierGroupDrizzleRepository.unassign({
      groupId: "g1",
      categoryId: "c1",
      productId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(dbMocks.deleteMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("unassign removes the row from product_modifier_groups", async () => {
    const result = await modifierGroupDrizzleRepository.unassign({
      groupId: "g3",
      categoryId: null,
      productId: "p1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(dbMocks.deleteMock).toHaveBeenCalledTimes(1);
  });

  it("unassign is a no-op when the assignment does not exist (no error)", async () => {
    // Per spec: group "g9" not assigned to category "c1" → no error, no rows affected.
    // A target IS provided; the delete just affects 0 rows.
    const result = await modifierGroupDrizzleRepository.unassign({
      groupId: "g9",
      categoryId: "c1",
      productId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(dbMocks.deleteMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  // ---------- 3.1.5 listByCategory / listByProduct ----------

  it("listByCategory returns groups ordered by sortOrder and excludes archived", async () => {
    // Query 1: db.select({ groupId }).from(categoryModifierGroups).where(eq(categoryId))
    const assignmentRows = [{ groupId: "g1" }, { groupId: "g2" }];
    dbMocks.selectMock.mockReturnValueOnce(selectColumnChain(assignmentRows));

    // Query 2: db.select().from(modifierGroups).where(inArray && isNull).orderBy(asc(sortOrder))
    const groupRows = [
      buildGroupRow({ id: "g2", name: "Leche", sortOrder: 1 }),
      buildGroupRow({ id: "g1", name: "Tamaño", sortOrder: 2 }),
    ];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(groupRows));

    // Query 3: db.select().from(modifierOptions).where(inArray(groupIds) && isNull).orderBy(asc(sortOrder))
    // Single query loads ALL options for ALL groups at once
    const allOptionRows = [
      buildOptionRow({ id: "o-g2-1", groupId: "g2", sortOrder: 0 }),
      buildOptionRow({ id: "o-g1-1", groupId: "g1", sortOrder: 0 }),
      buildOptionRow({ id: "o-g1-2", groupId: "g1", sortOrder: 1 }),
    ];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(allOptionRows));

    const result = await modifierGroupDrizzleRepository.listByCategory("c1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toHaveLength(2);
    // ordered by sortOrder ascending
    expect(result.value[0]!.id).toBe("g2");
    expect(result.value[0]!.sortOrder).toBe(1);
    expect(result.value[1]!.id).toBe("g1");
    expect(result.value[1]!.sortOrder).toBe(2);
    expect(result.value[1]!.options).toHaveLength(2);
    expect(result.value[0]!.options).toHaveLength(1);
  });

  it("listByCategory returns empty list when category has no assignments", async () => {
    dbMocks.selectMock.mockReturnValueOnce(selectColumnChain([]));

    const result = await modifierGroupDrizzleRepository.listByCategory("c9");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual([]);
  });

  it("listByProduct returns groups ordered by sortOrder and excludes archived", async () => {
    const assignmentRows = [{ groupId: "g3" }, { groupId: "g4" }];
    dbMocks.selectMock.mockReturnValueOnce(selectColumnChain(assignmentRows));

    const groupRows = [
      buildGroupRow({ id: "g4", name: "Salsa", sortOrder: 0 }),
      buildGroupRow({ id: "g3", name: "Leche", sortOrder: 1 }),
    ];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(groupRows));

    const allOptionRows = [
      buildOptionRow({ id: "o-g4-1", groupId: "g4", sortOrder: 0 }),
      buildOptionRow({ id: "o-g3-1", groupId: "g3", sortOrder: 0 }),
    ];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(allOptionRows));

    const result = await modifierGroupDrizzleRepository.listByProduct("p1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toHaveLength(2);
    expect(result.value[0]!.id).toBe("g4");
    expect(result.value[1]!.id).toBe("g3");
  });

  it("listByProduct returns empty list when product has no assignments", async () => {
    dbMocks.selectMock.mockReturnValueOnce(selectColumnChain([]));

    const result = await modifierGroupDrizzleRepository.listByProduct("p9");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual([]);
  });

  // ---------- findById ----------

  it("findById returns the group with its options when active", async () => {
    const groupRow = buildGroupRow({ id: "group-1" });
    // db.select().from(modifierGroups).where(...).limit(1)
    dbMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: mock(() => Promise.resolve([groupRow])),
        }),
      }),
    });

    const optionRows = [
      buildOptionRow({ id: "opt-1", groupId: "group-1", sortOrder: 0 }),
      buildOptionRow({ id: "opt-2", groupId: "group-1", sortOrder: 1 }),
    ];
    dbMocks.selectMock.mockReturnValueOnce(selectChain(optionRows));

    const result = await modifierGroupDrizzleRepository.findById("group-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.id).toBe("group-1");
    expect(result.value.options).toHaveLength(2);
    expect(result.value.options[0].sortOrder).toBe(0);
  });

  it("findById returns ModifierGroupNotFoundError when group does not exist", async () => {
    dbMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });

    const result = await modifierGroupDrizzleRepository.findById("missing");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected findById to fail for missing group");
    }
    expect(result.error).toBeInstanceOf(ModifierGroupNotFoundError);
  });
});