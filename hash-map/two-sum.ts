/**
 * Returns every unique pair of values from `intArray` that sums to
 * `targetSum`. Each pair is returned as `[smaller, larger]`, and each distinct
 * pair of values appears once no matter how often its members repeat in the
 * input.
 *
 * Note this is the "find all pairs" variant. Classic LeetCode Two Sum returns
 * the *indices* of a single pair; this returns *values*, for every pair.
 *
 * One pass builds a value → occurrence-count map. The second pass walks the
 * distinct values only, and for each one asks whether its complement is also
 * present.
 *
 * Time:  O(n) — one pass to count, one pass over distinct values (at most n).
 * Space: O(d) where d is the number of distinct values.
 */
export const twoSumAll = (intArray: number[], targetSum: number): number[][] => {
  const counts = new Map<number, number>();
  for (const num of intArray) {
    counts.set(num, (counts.get(num) ?? 0) + 1);
  }

  const sums: number[][] = [];
  for (const [num, count] of counts) {
    const complement = targetSum - num;

    // The smaller half of a pair does the emitting; the larger half defers.
    // Strictly `<`, so a self-pair (complement === num) is NOT skipped here.
    if (complement < num) continue;

    if (complement === num) {
      // A value pairs with itself only if the array holds two of them.
      if (count > 1) sums.push([num, num]);
    } else if (counts.has(complement)) {
      sums.push([num, complement]);
    }
  }

  return sums;
};

/**
 * Returns the first pair of elements of `intArray` that sums to `targetSum`,
 * as `[smaller, larger]`, or `null` when no pair exists.
 *
 * "First" means the pair that *completes* earliest — whichever pair's second
 * member appears soonest in the array, which is not the same as the leftmost
 * pair by first element. `[9,4,6,7]` at target 13 gives `[4,9]` (complete at
 * index 1), while `[6,7,4,9]` gives `[6,7]` (also complete at index 1).
 *
 * Deliberately NOT derived from `twoSumAll`. Building every pair means paying
 * a full O(n) counting pass before the first answer is available; this stops
 * the moment a complement turns up, which on early hits is orders of magnitude
 * faster.
 *
 * Returns `null` rather than `[]` for a miss: an empty array is truthy in
 * JavaScript, so `if (twoSumFirst(...))` would fire when nothing was found.
 *
 * Self-pairing needs no special case. The lookup happens *before* the insert,
 * so `seen` only ever holds earlier elements — a value can never match itself,
 * but a second copy of it matches the first.
 *
 * Time:  O(n) worst case, O(k) when a pair completes at index k.
 * Space: O(d) where d is the number of distinct values seen before the hit.
 *
 */
export const twoSumFirst = (intArray: number[], targetSum: number): [number, number] | null => {
  const seen = new Set<number>();

  for (const num of intArray) {
    const complement = targetSum - num;
    if (seen.has(complement)) {
      return [Math.min(num, complement), Math.max(num, complement)];
    }
    seen.add(num);
  }

  return null;
};
