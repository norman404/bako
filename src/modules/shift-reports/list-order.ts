import { SHIFT_LIST_ORDER, type ShiftListOrder } from "@/modules/settings";

export function sortShiftList<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
  order: ShiftListOrder,
): T[] {
  return [...items].sort((left, right) => {
    const difference = getDate(left).getTime() - getDate(right).getTime();
    return order === SHIFT_LIST_ORDER.ASCENDING ? difference : -difference;
  });
}
