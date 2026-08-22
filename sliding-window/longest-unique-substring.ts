/**
 * Returns the longest substring of `searchString` that contains no repeated
 * characters. Where several substrings tie for longest, the leftmost one is
 * returned.
 *
 * Sliding window. `left` and `right` bound a window that is always
 * duplicate-free; `chars` maps each character to the most recent index at
 * which it was seen. When the character at `i` is already in the window, the
 * window's left edge jumps past that character's previous occurrence.
 * `leftLongest` and `rightLongest` remember where the best window was, so the
 * substring itself can be sliced out at the end.
 *
 * This is the primary implementation for this problem —
 * `longestUniqueSubstringLength` is defined in terms of it.
 *
 * Time:  O(n) — every index is visited once and `left` only moves forward.
 * Space: O(min(n, k)) where k is the size of the character set.
 */
export const longestUniqueSubstring = (searchString: string): string => {
  let left = 0;
  let right = 0;
  let longest = 0;
  let leftLongest = 0;
  let rightLongest = 0;
  const chars = new Map<string, number>();

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

    // Strictly `<`, so a later window of equal length does not displace an
    // earlier one. That is what makes the leftmost winner the one returned.
    if (longest < right - left) {
      longest = right - left;
      leftLongest = left;
      rightLongest = right;
    }
  }

  // `right` is always one past the last index in the window, so this is
  // already the half-open range `substring` wants — no off-by-one adjustment.
  return searchString.substring(leftLongest, rightLongest);
};

/**
 * Returns the length of the longest substring of `searchString` that contains
 * no repeated characters.
 *
 * Defined in terms of `longestUniqueSubstring` so the two exports cannot
 * drift apart about the same window. The tie-break is irrelevant here: every
 * window tying for longest has, by definition, the same length.
 *
 * Time:  O(n).
 * Space: O(min(n, k)), plus the substring that is measured and discarded.
 */
export const longestUniqueSubstringLength = (searchString: string): number =>
  longestUniqueSubstring(searchString).length;
