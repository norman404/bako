export interface Category {
  id: string;
  name: string;
  description: string;
  color: string | null;
  menuId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
