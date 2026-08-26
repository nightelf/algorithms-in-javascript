/**
 * Returns the one value missing from a run of consecutive integers starting
 * at 1.
 *
 * ## Contract
 *
 * `list` must hold `n` distinct integers drawn from `1` through `n + 1`
 * inclusive, with exactly one of them absent.
 *
 * ```js
 * findMissingSequentialNumber([1, 2, 4, 5]); // 3  — run is 1..5
 * findMissingSequentialNumber([2, 3, 4]);    // 1  — run is 1..4
 * findMissingSequentialNumber([1, 2, 3]);    // 4  — run is 1..4
 * ```
 *
 * Note the run is one longer than the array: four elements describe the five
 * values 1..5, and it is the fifth that is missing.
 *
 * ## How it works
 *
 * The sum of the complete run is known in closed form, so the missing value is
 * whatever the actual sum falls short by — no sorting, no lookup table, one
 * pass. Summing `1..m` is `m * (m + 1) / 2`, and here `m` is `n + 1`:
 *
 * ```
 * expected = (n + 1) * (n + 2) / 2
 * ```
 *
 * ## Caller's responsibility
 *
 * Nothing here is validated — an input that breaks the contract returns a
 * plausible-looking number rather than throwing. Duplicates, gaps wider than
 * one, values outside the run, non-integers, and zero-based data all produce
 * quiet nonsense:
 *
 * ```js
 * findMissingSequentialNumber([1, 1, 2]); // 6  — a duplicate
 * findMissingSequentialNumber([1, 3, 5]); // 1  — not consecutive
 * findMissingSequentialNumber([0, 1, 2]); // 7  — zero-based input
 * ```
 *
 * One check is worth knowing: a valid answer always lies in `1..n + 1`. A
 * result outside that range is proof the contract was broken — though a result
 * inside it is no guarantee the contract was kept.
 *
 * Time:  O(n), one pass.
 * Space: O(1).
 *
 * @param {number[]} list `n` of the `n + 1` consecutive integers from 1
 * @returns {number} the absent value
 */
export const findMissingSequentialNumber = (list) => {
  const actualSum = list.reduce((acc, num) => acc + num, 0);

  // The complete run holds one more value than the array does, so summing
  // 1..(n + 1) gives (n + 1)(n + 2) / 2.
  const expectedSum = ((list.length + 1) * (list.length + 2)) / 2;

  return expectedSum - actualSum;
};

/**
 * Returns whether `list` satisfies the contract `findMissingSequentialNumber`
 * expects: `n` distinct integers drawn from `1` through `n + 1` inclusive.
 *
 * ```js
 * isValidSequentialList([1, 2, 4, 5]); // true  — 4 values from 1..5
 * isValidSequentialList([1, 1, 2]);    // false — duplicate
 * isValidSequentialList([1, 3, 5]);    // false — 5 is outside 1..4
 * isValidSequentialList([0, 1, 2]);    // false — 0 is outside 1..4
 * ```
 *
 * ## Why there is no "exactly one is missing" check
 *
 * It would be redundant. Once the values are known to be integers, in range,
 * and distinct, pigeonhole does the rest: `n` distinct values drawn from a run
 * of `n + 1` must leave exactly one of them absent. Counting the gap would be
 * checking something already guaranteed.
 *
 * ## Cost
 *
 * O(n) time and O(n) space, returning at the first offending element. That is
 * the same order as `findMissingSequentialNumber` itself, so validating
 * roughly doubles the work — which is why it is a separate function rather
 * than a step inside the algorithm. Call it when the input is untrusted, skip
 * it when you built the list yourself.
 *
 * @param {*} list untrusted input — anything at all
 * @returns {boolean}
 */
export const isValidSequentialList = (list) => {
  if (!Array.isArray(list)) return false;

  const highest = list.length + 1;
  const seen = new Set();

  for (const num of list) {
    if (!Number.isInteger(num)) return false;
    if (num < 1 || num > highest) return false;
    if (seen.has(num)) return false;
    seen.add(num);
  }

  return true;
};
