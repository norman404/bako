import { eq } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import type { Menu } from "@/modules/menu/domain/menu";
import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { MenuCreateInput, MenuRepository } from "@/modules/menu/domain/ports";
import { db } from "@/shared/db/client";
import { menus, type MenuRow } from "@/shared/db/schema";

function rowToMenu(row: MenuRow): Menu {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new MenuDomainError(`${context}: ${String(cause)}`);
}

function validateMenuInput(input: MenuCreateInput): MenuDomainError | null {
  if (input.name.trim().length === 0) {
    return new MenuDomainError("Menu name is required");
  }

  return null;
}

function normalizeMenuInput(input: MenuCreateInput): MenuCreateInput {
  return {
    name: input.name.trim(),
    isDefault: input.isDefault ?? false,
  };
}

export const menuDrizzleRepository: MenuRepository = {
  list() {
    return ResultAsync.fromPromise(
      db.select().from(menus),
      wrapDbError("Failed to list menus"),
    ).map((rows) => rows.map(rowToMenu));
  },

  create(input: MenuCreateInput) {
    const validationError = validateMenuInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeMenuInput(input);
    const menuId = crypto.randomUUID();
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .insert(menus)
        .values({
          id: menuId,
          name: normalizedInput.name,
          isDefault: normalizedInput.isDefault,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      wrapDbError("Failed to create menu"),
    ).andThen((rows) => {
      const [createdMenu] = rows;
      if (!createdMenu) {
        return errAsync(new MenuDomainError("Failed to load created menu"));
      }

      return okAsync(rowToMenu(createdMenu));
    });
  },

  update(id: string, input: MenuCreateInput) {
    const validationError = validateMenuInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeMenuInput(input);
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .update(menus)
        .set({
          name: normalizedInput.name,
          isDefault: normalizedInput.isDefault,
          updatedAt: now,
        })
        .where(eq(menus.id, id))
        .returning(),
      wrapDbError("Failed to update menu"),
    ).andThen((rows) => {
      const [updatedMenu] = rows;
      if (!updatedMenu) {
        return errAsync(new MenuDomainError("Menu not found"));
      }

      return okAsync(rowToMenu(updatedMenu));
    });
  },

  delete(id: string) {
    return ResultAsync.fromPromise(
      db.delete(menus).where(eq(menus.id, id)).returning({ id: menus.id }),
      wrapDbError("Failed to delete menu"),
    ).andThen((rows) => {
      if (rows.length === 0) {
        return errAsync(new MenuDomainError("Menu not found"));
      }

      return okAsync(undefined);
    });
  },
};
