import { and, eq, inArray, isNull } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { MenuDomainError, ProductNotFoundError } from "@/modules/menu/domain/errors";
import type { ProductRepository, ProductUpsertInput } from "@/modules/menu/domain/ports";
import type { Product } from "@/modules/menu/domain/product";
import { db } from "@/shared/db/client";
import { productMenus, products, type ProductRow } from "@/shared/db/schema";

function rowToProduct(row: ProductRow, menuIds: string[] = []): Product {
  return {
    id: row.id,
    categoryId: row.categoryId,
    menuIds,
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

  if (!Number.isInteger(input.price) || input.price < 0) {
    return new MenuDomainError("Product price must be a non-negative integer in cents");
  }

  const prepTimeMinutes = input.prepTimeMinutes ?? 0;
  if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 0) {
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

async function loadMenuIdsForProduct(productId: string): Promise<string[]> {
  const rows = await db
    .select({ menuId: productMenus.menuId })
    .from(productMenus)
    .where(eq(productMenus.productId, productId));

  return rows.map((row) => row.menuId);
}

function loadActiveProductById(id: string, context: string): ResultAsync<Product, MenuDomainError> {
  return ResultAsync.fromPromise(
    findActiveProductRowById(id).then(async (row) => {
      if (!row) {
        return { row: undefined, menuIds: [] };
      }

      const menuIds = await loadMenuIdsForProduct(id);
      return { row, menuIds };
    }),
    wrapDbError(context),
  ).andThen(({ row, menuIds }) => {
    if (!row) {
      return errAsync(new ProductNotFoundError(id));
    }

    return okAsync(rowToProduct(row, menuIds));
  });
}

function normalizeProductInput(input: ProductUpsertInput): Required<ProductUpsertInput> {
  return {
    ...input,
    categoryId: input.categoryId.trim(),
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    image: (input.image ?? "").trim(),
    prepTimeMinutes: input.prepTimeMinutes ?? 0,
    menuIds: input.menuIds,
  };
}

export const productDrizzleRepository: ProductRepository = {
  list(menuIds?: string[]) {
    return ResultAsync.fromPromise(
      (async () => {
        let productRows: ProductRow[];

        if (menuIds && menuIds.length > 0) {
          // Query productMenus to find productIds for the given menuIds
          const productMenuRows = await db
            .select({ productId: productMenus.productId })
            .from(productMenus)
            .where(inArray(productMenus.menuId, menuIds));

          const productIds = [...new Set(productMenuRows.map((row) => row.productId))];

          if (productIds.length === 0) {
            return [];
          }

          // Query products for those productIds
          productRows = await db
            .select()
            .from(products)
            .where(and(inArray(products.id, productIds), isNull(products.deletedAt)));
        } else {
          // Query all active products
          productRows = await db.select().from(products).where(isNull(products.deletedAt));
        }

        // Load menuIds for each product
        const productIds = productRows.map((row) => row.id);
        if (productIds.length === 0) {
          return [];
        }

        const allProductMenuRows = await db
          .select()
          .from(productMenus)
          .where(inArray(productMenus.productId, productIds));

        // Group menuIds by productId
        const menuIdsByProductId = new Map<string, string[]>();
        for (const row of allProductMenuRows) {
          const existing = menuIdsByProductId.get(row.productId) ?? [];
          existing.push(row.menuId);
          menuIdsByProductId.set(row.productId, existing);
        }

        return productRows.map((row) => rowToProduct(row, menuIdsByProductId.get(row.id) ?? []));
      })(),
      wrapDbError("Failed to list products"),
    );
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
      (async () => {
        // Insert product (WITHOUT menuId)
        const productRows = await db
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
          .returning();

        const [createdProduct] = productRows;
        if (!createdProduct) {
          throw new ProductNotFoundError(productId);
        }

        // Insert product-menu associations only when there are menus selected
        const productMenuValues = normalizedInput.menuIds.map((menuId) => ({
          productId,
          menuId,
        }));

        if (productMenuValues.length > 0) {
          await db.insert(productMenus).values(productMenuValues);
        }

        return { product: createdProduct, menuIds: normalizedInput.menuIds };
      })(),
      wrapDbError("Failed to create product"),
    ).andThen(({ product, menuIds }) => okAsync(rowToProduct(product, menuIds)));
  },

  update(id: string, input: ProductUpsertInput) {
    const validationError = validateProductInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeProductInput(input);
    const now = new Date();

    return ResultAsync.fromPromise(
      (async () => {
        // Update product (WITHOUT menuId)
        const productRows = await db
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
          .returning();

        const [updatedProduct] = productRows;
        if (!updatedProduct) {
          throw new ProductNotFoundError(id);
        }

        // Delete old product-menu associations
        await db.delete(productMenus).where(eq(productMenus.productId, id));

        // Insert new product-menu associations only when there are menus selected
        const productMenuValues = normalizedInput.menuIds.map((menuId) => ({
          productId: id,
          menuId,
        }));

        if (productMenuValues.length > 0) {
          await db.insert(productMenus).values(productMenuValues);
        }

        return { product: updatedProduct, menuIds: normalizedInput.menuIds };
      })(),
      wrapDbError("Failed to update product"),
    ).andThen(({ product, menuIds }) => okAsync(rowToProduct(product, menuIds)));
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
