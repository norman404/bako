import type { WeeklySchedule } from "@/lib/weekly-schedule";

export const PRODUCT_KIND = {
  STANDARD: "standard",
  COMPOSITE: "composite",
} as const;

export type ProductKind = (typeof PRODUCT_KIND)[keyof typeof PRODUCT_KIND];

export interface ProductComponent {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  categoryId: string;
  menuIds: string[];
  name: string;
  description: string;
  price: number;
  costPrice: number;
  prepTimeMinutes: number;
  image: string;
  isPopular: boolean;
  kind: ProductKind;
  // For composite products: when the promo price applies. Null means always.
  availabilitySchedule: WeeklySchedule | null;
  components: ProductComponent[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
