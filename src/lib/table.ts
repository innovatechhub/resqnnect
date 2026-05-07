export type SortDirection = 'asc' | 'desc';

export function sortByKey<T>(
  items: T[],
  getValue: (item: T) => string | number | null | undefined,
  direction: SortDirection,
): T[] {
  return [...items].sort((left, right) => {
    const a = getValue(left);
    const b = getValue(right);

    if (a == null && b == null) {
      return 0;
    }
    if (a == null) {
      return 1;
    }
    if (b == null) {
      return -1;
    }

    const normalizedA = typeof a === 'string' ? a.toLowerCase() : a;
    const normalizedB = typeof b === 'string' ? b.toLowerCase() : b;

    if (normalizedA < normalizedB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (normalizedA > normalizedB) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function getPageCount(totalCount: number, pageSize: number): number {
  return Math.ceil(totalCount / pageSize);
}
