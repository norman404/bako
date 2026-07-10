import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import type {
  ModifierAssignmentInput,
  ModifierGroupRepository,
  ModifierGroupUpsertInput,
  ModifierOptionInput,
} from "@/modules/menu/domain/ports";
import type { ModifierGroup, ModifierOption, ModifierGroupType } from "@/modules/menu/domain/modifier-group";
import { MenuDomainError, ModifierGroupNotFoundError } from "@/modules/menu/domain/errors";
import { db } from "@/shared/db/client";
import {
  categoryModifierGroups,
  modifierGroups,
  modifierOptions,
  productModifierGroups,
  type ModifierGroupRow,
  type ModifierOptionRow,
} from "@/shared/db/schema";

const VALID_MODIFIER_GROUP_TYPES: readonly ModifierGroupType[] = [
  "single",
  "multiple",
  "text",
  "single_text",
] as const;

function rowToOption(row: ModifierOptionRow): ModifierOption {
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    priceDelta: row.priceDelta,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function rowToGroup(row: ModifierGroupRow, options: ModifierOption[] = []): ModifierGroup {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ModifierGroupType,
    required: row.required,
    sortOrder: row.sortOrder,
    options,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new MenuDomainError(`${context}: ${String(cause)}`);
}

function validateModifierGroupInput(input: ModifierGroupUpsertInput): MenuDomainError | null {
  if (input.name.trim().length === 0) {
    return new MenuDomainError("Modifier group name is required");
  }

  if (!VALID_MODIFIER_GROUP_TYPES.includes(input.type)) {
    return new MenuDomainError(
      `Modifier group type must be one of: ${VALID_MODIFIER_GROUP_TYPES.join(", ")}`,
    );
  }

  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return new MenuDomainError("Modifier group sortOrder must be a non-negative integer");
  }

  if (input.options.length === 0) {
    return new MenuDomainError("Modifier group must have at least one option");
  }

  for (const option of input.options) {
    const optionError = validateModifierOptionInput(option, input.type);
    if (optionError) {
      return optionError;
    }
  }

  // Single-default constraint for single / single_text groups
  if (input.type === "single" || input.type === "single_text") {
    const defaultCount = input.options.filter((o) => o.isDefault).length;
    if (defaultCount > 1) {
      return new MenuDomainError(
        `Modifier group of type "${input.type}" may have at most one default option`,
      );
    }
  }

  return null;
}

function validateModifierOptionInput(
  option: ModifierOptionInput,
  groupType: ModifierGroupType,
): MenuDomainError | null {
  if (option.name.trim().length === 0) {
    return new MenuDomainError("Modifier option name is required");
  }

  if (!Number.isInteger(option.priceDelta) || option.priceDelta < 0) {
    return new MenuDomainError("Modifier option priceDelta must be a non-negative integer in cents");
  }

  if (!Number.isInteger(option.sortOrder) || option.sortOrder < 0) {
    return new MenuDomainError("Modifier option sortOrder must be a non-negative integer");
  }

  // text-only groups conceptually have no options — but the repo allows a single
  // placeholder option (see spec: text groups have no options). We do not reject here
  // because the use-case layer decides whether options are allowed per type.
  // The single-default constraint is enforced at the group level above.
  void groupType;

  return null;
}

function normalizeModifierOptionInput(input: ModifierOptionInput): ModifierOptionInput {
  return {
    ...input,
    name: input.name.trim(),
  };
}

function normalizeModifierGroupInput(input: ModifierGroupUpsertInput): ModifierGroupUpsertInput {
  return {
    name: input.name.trim(),
    type: input.type,
    required: input.required,
    sortOrder: input.sortOrder,
    options: input.options.map(normalizeModifierOptionInput),
  };
}

function validateModifierAssignmentInput(input: ModifierAssignmentInput): MenuDomainError | null {
  const hasCategory = input.categoryId !== null && input.categoryId !== undefined;
  const hasProduct = input.productId !== null && input.productId !== undefined;

  if (!hasCategory && !hasProduct) {
    return new MenuDomainError("Modifier assignment requires at least one of categoryId or productId");
  }

  if (hasCategory && hasProduct) {
    return new MenuDomainError(
      "Modifier assignment requires exactly one of categoryId or productId (not both)",
    );
  }

  if (input.groupId.trim().length === 0) {
    return new MenuDomainError("Modifier assignment requires a groupId");
  }

  return null;
}

async function findActiveGroupRowById(id: string): Promise<ModifierGroupRow | undefined> {
  const rows = await db
    .select()
    .from(modifierGroups)
    .where(and(eq(modifierGroups.id, id), isNull(modifierGroups.deletedAt)))
    .limit(1);

  return rows[0];
}

async function loadActiveOptionsForGroup(groupId: string): Promise<ModifierOption[]> {
  const rows = await db
    .select()
    .from(modifierOptions)
    .where(and(eq(modifierOptions.groupId, groupId), isNull(modifierOptions.deletedAt)))
    .orderBy(asc(modifierOptions.sortOrder));

  return rows.map(rowToOption);
}

async function loadActiveOptionsForGroupIds(
  groupIds: string[],
): Promise<Map<string, ModifierOption[]>> {
  const result = new Map<string, ModifierOption[]>();

  if (groupIds.length === 0) {
    return result;
  }

  const rows = await db
    .select()
    .from(modifierOptions)
    .where(
      and(
        inArray(modifierOptions.groupId, groupIds),
        isNull(modifierOptions.deletedAt),
      ),
    )
    .orderBy(asc(modifierOptions.sortOrder));

  for (const row of rows) {
    const existing = result.get(row.groupId) ?? [];
    existing.push(rowToOption(row));
    result.set(row.groupId, existing);
  }

  return result;
}

function loadActiveGroupById(
  id: string,
  context: string,
): ResultAsync<ModifierGroup, MenuDomainError> {
  return ResultAsync.fromPromise(
    (async () => {
      const row = await findActiveGroupRowById(id);
      if (!row) {
        return { row: undefined, options: [] };
      }
      const options = await loadActiveOptionsForGroup(id);
      return { row, options };
    })(),
    wrapDbError(context),
  ).andThen(({ row, options }) => {
    if (!row) {
      return errAsync(new ModifierGroupNotFoundError(id));
    }
    return okAsync(rowToGroup(row, options));
  });
}

export const modifierGroupDrizzleRepository: ModifierGroupRepository = {
  list() {
    return ResultAsync.fromPromise(
      (async () => {
        const groupRows = await db
          .select()
          .from(modifierGroups)
          .where(isNull(modifierGroups.deletedAt))
          .orderBy(asc(modifierGroups.sortOrder));

        if (groupRows.length === 0) {
          return [] as ModifierGroup[];
        }

        const groupIds = groupRows.map((row) => row.id);
        const optionsByGroupId = await loadActiveOptionsForGroupIds(groupIds);

        return groupRows.map((row) =>
          rowToGroup(row, optionsByGroupId.get(row.id) ?? []),
        );
      })(),
      wrapDbError("Failed to list modifier groups"),
    );
  },

  findById(id: string) {
    return loadActiveGroupById(id, "Failed to find modifier group");
  },

  create(input: ModifierGroupUpsertInput) {
    const validationError = validateModifierGroupInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeModifierGroupInput(input);
    const groupId = crypto.randomUUID();
    const now = new Date();

    return ResultAsync.fromPromise(
      (async () => {
        const groupRows = await db
          .insert(modifierGroups)
          .values({
            id: groupId,
            name: normalizedInput.name,
            type: normalizedInput.type,
            required: normalizedInput.required,
            sortOrder: normalizedInput.sortOrder,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const [createdGroup] = groupRows;
        if (!createdGroup) {
          throw new MenuDomainError("Failed to load created modifier group");
        }

        const optionRows = normalizedInput.options.map((option) => ({
          id: crypto.randomUUID(),
          groupId,
          name: option.name,
          priceDelta: option.priceDelta,
          isDefault: option.isDefault,
          sortOrder: option.sortOrder,
          createdAt: now,
          updatedAt: now,
        }));

        await db.insert(modifierOptions).values(optionRows);

        return {
          group: createdGroup,
          options: optionRows.map((row) => ({
            id: row.id,
            groupId: row.groupId,
            name: row.name,
            priceDelta: row.priceDelta,
            isDefault: row.isDefault,
            sortOrder: row.sortOrder,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deletedAt: null,
          })) as ModifierOption[],
        };
      })(),
      wrapDbError("Failed to create modifier group"),
    ).map(({ group, options }) => rowToGroup(group, options));
  },

  update(id: string, input: ModifierGroupUpsertInput) {
    const validationError = validateModifierGroupInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeModifierGroupInput(input);
    const now = new Date();

    return ResultAsync.fromPromise(
      (async () => {
        const groupRows = await db
          .update(modifierGroups)
          .set({
            name: normalizedInput.name,
            type: normalizedInput.type,
            required: normalizedInput.required,
            sortOrder: normalizedInput.sortOrder,
            updatedAt: now,
          })
          .where(and(eq(modifierGroups.id, id), isNull(modifierGroups.deletedAt)))
          .returning();

        const [updatedGroup] = groupRows;
        if (!updatedGroup) {
          return { group: undefined as ModifierGroupRow | undefined, options: [] as ModifierOption[] };
        }

        // Replace options: delete old, insert new (delete-then-insert pattern)
        await db
          .delete(modifierOptions)
          .where(eq(modifierOptions.groupId, id));

        const optionRows = normalizedInput.options.map((option) => ({
          id: crypto.randomUUID(),
          groupId: id,
          name: option.name,
          priceDelta: option.priceDelta,
          isDefault: option.isDefault,
          sortOrder: option.sortOrder,
          createdAt: now,
          updatedAt: now,
        }));

        await db.insert(modifierOptions).values(optionRows);

        const options: ModifierOption[] = optionRows.map((row) => ({
          id: row.id,
          groupId: row.groupId,
          name: row.name,
          priceDelta: row.priceDelta,
          isDefault: row.isDefault,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deletedAt: null,
        }));

        return { group: updatedGroup, options };
      })(),
      wrapDbError("Failed to update modifier group"),
    ).andThen(({ group, options }) => {
      if (!group) {
        return errAsync(new ModifierGroupNotFoundError(id));
      }
      return okAsync(rowToGroup(group, options));
    });
  },

  archive(id: string) {
    const now = new Date();

    return ResultAsync.fromPromise(
      (async () => {
        const groupRows = await db
          .update(modifierGroups)
          .set({
            deletedAt: now,
            updatedAt: now,
          })
          .where(and(eq(modifierGroups.id, id), isNull(modifierGroups.deletedAt)))
          .returning({ id: modifierGroups.id });

        if (groupRows.length === 0) {
          return { archived: false as const };
        }

        // Cascade soft-delete to options
        await db
          .update(modifierOptions)
          .set({
            deletedAt: now,
            updatedAt: now,
          })
          .where(
            and(eq(modifierOptions.groupId, id), isNull(modifierOptions.deletedAt)),
          );

        return { archived: true as const };
      })(),
      wrapDbError("Failed to archive modifier group"),
    ).andThen(({ archived }) => {
      if (!archived) {
        return errAsync(new ModifierGroupNotFoundError(id));
      }
      return okAsync(undefined);
    });
  },

  assign(input: ModifierAssignmentInput) {
    const validationError = validateModifierAssignmentInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    return ResultAsync.fromPromise(
      (async () => {
        if (input.categoryId !== null && input.categoryId !== undefined) {
          await db.insert(categoryModifierGroups).values({
            categoryId: input.categoryId,
            groupId: input.groupId,
          });
          return;
        }

        // productId guaranteed by validation
        await db.insert(productModifierGroups).values({
          productId: input.productId!,
          groupId: input.groupId,
        });
      })(),
      wrapDbError("Failed to assign modifier group"),
    );
  },

  unassign(input: ModifierAssignmentInput) {
    const validationError = validateModifierAssignmentInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    return ResultAsync.fromPromise(
      (async () => {
        if (input.categoryId !== null && input.categoryId !== undefined) {
          await db
            .delete(categoryModifierGroups)
            .where(
              and(
                eq(categoryModifierGroups.categoryId, input.categoryId),
                eq(categoryModifierGroups.groupId, input.groupId),
              ),
            );
          return;
        }

        await db
          .delete(productModifierGroups)
          .where(
            and(
              eq(productModifierGroups.productId, input.productId!),
              eq(productModifierGroups.groupId, input.groupId),
            ),
          );
      })(),
      wrapDbError("Failed to unassign modifier group"),
    );
  },

  listByCategory(categoryId: string) {
    return ResultAsync.fromPromise(
      (async () => {
        const assignmentRows = await db
          .select({ groupId: categoryModifierGroups.groupId })
          .from(categoryModifierGroups)
          .where(eq(categoryModifierGroups.categoryId, categoryId));

        const groupIds = assignmentRows.map((row) => row.groupId);

        if (groupIds.length === 0) {
          return [] as ModifierGroup[];
        }

        const groupRows = await db
          .select()
          .from(modifierGroups)
          .where(
            and(
              inArray(modifierGroups.id, groupIds),
              isNull(modifierGroups.deletedAt),
            ),
          )
          .orderBy(asc(modifierGroups.sortOrder));

        return loadGroups(groupRows);
      })(),
      wrapDbError("Failed to list modifier groups by category"),
    );
  },

  listByProduct(productId: string) {
    return ResultAsync.fromPromise(
      (async () => {
        const assignmentRows = await db
          .select({ groupId: productModifierGroups.groupId })
          .from(productModifierGroups)
          .where(eq(productModifierGroups.productId, productId));

        const groupIds = assignmentRows.map((row) => row.groupId);

        if (groupIds.length === 0) {
          return [] as ModifierGroup[];
        }

        const groupRows = await db
          .select()
          .from(modifierGroups)
          .where(
            and(
              inArray(modifierGroups.id, groupIds),
              isNull(modifierGroups.deletedAt),
            ),
          )
          .orderBy(asc(modifierGroups.sortOrder));

        return loadGroups(groupRows);
      })(),
      wrapDbError("Failed to list modifier groups by product"),
    );
  },
};

async function loadGroups(groupRows: ModifierGroupRow[]): Promise<ModifierGroup[]> {
  if (groupRows.length === 0) {
    return [];
  }

  const groupIds = groupRows.map((row) => row.id);
  const optionsByGroupId = await loadActiveOptionsForGroupIds(groupIds);

  return groupRows.map((row) => rowToGroup(row, optionsByGroupId.get(row.id) ?? []));
}