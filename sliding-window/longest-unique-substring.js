/**
 * Returns the length of the longest substring of `searchString` that contains
 * no repeated characters.
 *
 * Sliding window. `left` and `right` bound a window that is always
 * duplicate-free; `chars` maps each character to the most recent index at
 * which it was seen. When the character at `i` is already in the window, the
 * window's left edge jumps past that character's previous occurrence.
 *
 * Time:  O(n) — every index is visited once and `left` only moves forward.
 * Space: O(min(n, k)) where k is the size of the character set.
 *
 * @param {string} searchString
 * @returns {number} length of the longest duplicate-free substring
 */
export const longestUniqueSubstringLength = (searchString) => {
  let left = 0;
  let right = 0;
  let longest = 0;
  const chars = new Map();

  for (let i = 0; i < searchString.length; i++) {
    const character = searchString[i];
    const previousIndex = chars.get(character);

    if (previousIndex !== undefined) {
      // Math.max keeps `left` from jumping backwards onto a stale index that
      // has already fallen outside the window. Without it, "abba" reports 3.
      left = Math.max(left, previousIndex + 1);
    }

    chars.set(character, i);
    right++;
    longest = Math.max(longest, right - left);
  }

  return longest;
};
