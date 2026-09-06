export const INTELLIGENCE_PAGE_SIZE = 500;

export function pageRange(
  from: number,
  pageSize = INTELLIGENCE_PAGE_SIZE
): { from: number; to: number } {
  return { from, to: from + pageSize - 1 };
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = INTELLIGENCE_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { to } = pageRange(from, pageSize);
    const page = await fetchPage(from, to);
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return all;
}
