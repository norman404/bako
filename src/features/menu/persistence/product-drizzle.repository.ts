import { and, eq, isNull } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { MenuDomainError, ProductNotFoundError } from "@/features/menu/domain/errors";
import type { ProductRepository, ProductUpsertInput } from "@/features/menu/domain/ports";
import type { Product } from "@/features/menu/domain/product";
import { db } from "@/shared/infrastructure/db/client";
import { products, type ProductRow } from "@/shared/infrastructure/db/schema";

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    price: row.price,
    prepTimeMinutes: row.prepTimeMinutes,
    image: row.image,
    isPopular: row.isPopular,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new MenuDomainError(`${context}: ${String(cause)}`);
}

function validateProductInput(input: ProductUpsertInput): MenuDomainError | null {
  if (input.categoryId.trim().length === 0) {
    return new MenuDomainError("Category is required");
  }

  if (input.name.trim().length === 0) {
    return new MenuDomainError("Product name is required");
  }

  if (input.description.trim().length === 0) {
    return new MenuDomainError("Product description is required");
  }

  if (input.image.trim().length === 0) {
    return new MenuDomainError("Product image is required");
  }

  if (!Number.isInteger(input.price) || input.price < 0) {
    return new MenuDomainError("Product price must be a non-negative integer in cents");
  }

  if (!Number.isInteger(input.prepTimeMinutes) || input.prepTimeMinutes < 0) {
    return new MenuDomainError("Prep time must be a non-negative integer in minutes");
  }

  return null;
}

async function findActiveProductRowById(id: string): Promise<ProductRow | undefined> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);

  return rows[0];
}

function loadActiveProductById(id: string, context: string): ResultAsync<Product, MenuDomainError> {
  return ResultAsync.fromPromise(findActiveProductRowById(id), wrapDbError(context)).andThen((row) => {
    if (!row) {
      return errAsync(new ProductNotFoundError(id));
    }

    return okAsync(rowToProduct(row));
  });
}

function normalizeProductInput(input: ProductUpsertInput): ProductUpsertInput {
  return {
    ...input,
    categoryId: input.categoryId.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    image: input.image.trim(),
  };
}

export const productDrizzleRepository: ProductRepository = {
  list() {
    return ResultAsync.fromPromise(
      db.select().from(products).where(isNull(products.deletedAt)),
      wrapDbError("Failed to list products"),
    ).map((rows) => rows.map(rowToProduct));
  },

  findById(id: string) {
    return loadActiveProductById(id, "Failed to find product");
  },

  create(input: ProductUpsertInput) {
    const validationError = validateProductInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeProductInput(input);
    const productId = crypto.randomUUID();
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .insert(products)
        .values({
          id: productId,
          categoryId: normalizedInput.categoryId,
          name: normalizedInput.name,
          description: normalizedInput.description,
          price: normalizedInput.price,
          prepTimeMinutes: normalizedInput.prepTimeMinutes,
          image: normalizedInput.image,
          isPopular: normalizedInput.isPopular,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      wrapDbError("Failed to create product"),
    ).andThen((rows) => {
      const [createdProduct] = rows;
      if (!createdProduct) {
        return errAsync(new ProductNotFoundError(productId));
      }

      return okAsync(rowToProduct(createdProduct));
    });
  },

  update(id: string, input: ProductUpsertInput) {
    const validationError = validateProductInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeProductInput(input);
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .update(products)
        .set({
          categoryId: normalizedInput.categoryId,
          name: normalizedInput.name,
          description: normalizedInput.description,
          price: normalizedInput.price,
          prepTimeMinutes: normalizedInput.prepTimeMinutes,
          image: normalizedInput.image,
          isPopular: normalizedInput.isPopular,
          updatedAt: now,
        })
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .returning(),
      wrapDbError("Failed to update product"),
    ).andThen((rows) => {
      const [updatedProduct] = rows;
      if (!updatedProduct) {
        return errAsync(new ProductNotFoundError(id));
      }

      return okAsync(rowToProduct(updatedProduct));
    });
  },

  archive(id: string) {
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .update(products)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .returning({ id: products.id }),
      wrapDbError("Failed to archive product"),
    ).andThen((rows) => {
      if (rows.length === 0) {
        return errAsync(new ProductNotFoundError(id));
      }

      return okAsync(undefined);
    });
  },
};
