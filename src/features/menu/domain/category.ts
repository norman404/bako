export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
