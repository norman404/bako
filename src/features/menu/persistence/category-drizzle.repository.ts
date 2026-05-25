import { and, eq, isNull } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import type { Category } from "@/features/menu/domain/category";
import { CategoryNotFoundError, MenuDomainError } from "@/features/menu/domain/errors";
import type { CategoryCreateInput, CategoryRepository } from "@/features/menu/domain/ports";
import { db } from "@/shared/infrastructure/db/client";
import { categories, type CategoryRow, products } from "@/shared/infrastructure/db/schema";

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new MenuDomainError(`${context}: ${String(cause)}`);
}

function validateCategoryInput(input: CategoryCreateInput): MenuDomainError | null {
  if (input.name.trim().length === 0) {
    return new MenuDomainError("Category name is required");
  }

  if (input.description.trim().length === 0) {
    return new MenuDomainError("Category description is required");
  }

  return null;
}

function normalizeCategoryInput(input: CategoryCreateInput): CategoryCreateInput {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
  };
}

async function findActiveCategoryRowById(id: string): Promise<CategoryRow | undefined> {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .limit(1);

  return rows[0];
}

async function findActiveProductInCategory(categoryId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)))
    .limit(1);

  return rows[0];
}

function loadActiveCategoryRowById(id: string, context: string): ResultAsync<CategoryRow, MenuDomainError> {
  return ResultAsync.fromPromise(findActiveCategoryRowById(id), wrapDbError(context)).andThen((row) => {
    if (!row) {
      return errAsync(new CategoryNotFoundError(id));
    }

    return okAsync(row);
  });
}

function loadActiveCategoryById(id: string, context: string): ResultAsync<Category, MenuDomainError> {
  return loadActiveCategoryRowById(id, context).map(rowToCategory);
}

function ensureCategoryHasNoActiveProducts(categoryId: string): ResultAsync<void, MenuDomainError> {
  return ResultAsync.fromPromise(
    findActiveProductInCategory(categoryId),
    wrapDbError("Failed to check active products for category"),
  ).andThen((product) => {
    if (product) {
      return errAsync(new MenuDomainError("Cannot archive category with active products"));
    }

    return okAsync(undefined);
  });
}

export const categoryDrizzleRepository: CategoryRepository = {
  list() {
    return ResultAsync.fromPromise(
      db.select().from(categories).where(isNull(categories.deletedAt)),
      wrapDbError("Failed to list categories"),
    ).map((rows) => rows.map(rowToCategory));
  },

  findById(id: string) {
    return loadActiveCategoryById(id, "Failed to find category");
  },

  create(input: CategoryCreateInput) {
    const validationError = validateCategoryInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeCategoryInput(input);
    const categoryId = crypto.randomUUID();
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .insert(categories)
        .values({
          id: categoryId,
          name: normalizedInput.name,
          description: normalizedInput.description,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      wrapDbError("Failed to create category"),
    ).andThen((rows) => {
      const [createdCategory] = rows;
      if (!createdCategory) {
        return errAsync(new MenuDomainError("Failed to load created category"));
      }

      return okAsync(rowToCategory(createdCategory));
    });
  },

  update(id: string, input: CategoryCreateInput) {
    const validationError = validateCategoryInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeCategoryInput(input);
    const now = new Date();

    return loadActiveCategoryRowById(id, "Failed to find category").andThen(() =>
      ResultAsync.fromPromise(
        db
          .update(categories)
          .set({
            name: normalizedInput.name,
            description: normalizedInput.description,
            updatedAt: now,
          })
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .returning(),
        wrapDbError("Failed to update category"),
      ),
    ).andThen((rows) => {
      const [updatedCategory] = rows;
      if (!updatedCategory) {
        return errAsync(new CategoryNotFoundError(id));
      }

      return okAsync(rowToCategory(updatedCategory));
    });
  },

  archive(id: string) {
    const now = new Date();

    return loadActiveCategoryRowById(id, "Failed to find category")
      .andThen(() => ensureCategoryHasNoActiveProducts(id))
      .andThen(() =>
        ResultAsync.fromPromise(
          db
            .update(categories)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
            .returning({ id: categories.id }),
          wrapDbError("Failed to archive category"),
        ),
      )
      .andThen((rows) => {
        if (rows.length === 0) {
          return errAsync(new CategoryNotFoundError(id));
        }

        return okAsync(undefined);
      });
  },
};
