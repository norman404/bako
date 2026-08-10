export interface Product {
  id: string;
  categoryId: string;
  menuIds: string[];
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  image: string;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
