function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i += 1) {
    const pair = text.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/**
 * Title similarity in [0, 1] (Sørensen–Dice on character bigrams).
 * Window titles drift ("● main.ts — OrgaWin" vs "main.ts — OrgaWin"), so exact matching is too strict.
 */
export function titleSimilarity(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) {
    return 1;
  }
  if (left.length < 2 || right.length < 2) {
    return 0;
  }
  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  let shared = 0;
  for (const [pair, count] of leftPairs) {
    shared += Math.min(count, rightPairs.get(pair) ?? 0);
  }
  return (2 * shared) / (left.length - 1 + (right.length - 1));
}
