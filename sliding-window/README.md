# Sliding Window

A sliding window keeps a contiguous range of an array or string — bounded by a
`left` and a `right` index — and moves those bounds forward to maintain some
invariant (no duplicates, sum below a threshold, at most _k_ distinct values).

The pattern applies when:

- the answer is a **contiguous** run (a substring or subarray, not a subsequence), and
- extending or shrinking the window can be updated **incrementally**, without
  rescanning what is already inside it.

Both bounds only ever move forward, so each element is entered and left at most
once. That is what turns an O(n²) "check every substring" solution into O(n).

---

## `longestUniqueSubstringLength`

> Given a string `s`, find the length of the longest substring without
> duplicate characters.
>
> `0 <= s.length <= 5 * 10^4`; `s` consists of English letters, digits, symbols
> and spaces.
> ([LeetCode 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/))

**Files:** [`longest-unique-substring.js`](./longest-unique-substring.js) ·
[`longest-unique-substring.ts`](./longest-unique-substring.ts) ·
[`longest-unique-substring.test.ts`](./longest-unique-substring.test.ts)

### How it works

The window `[left, right)` is maintained as an always-duplicate-free range.
A `Map` records, for every character, the **most recent index** at which it was
seen.

For each index `i`:

1. If the character was seen before, move `left` past that previous occurrence —
   every window that still contained it would now have a duplicate.
2. Record the character's new index.
3. Advance `right`, and record `right - left` if it beats the best so far.

```
"pwwkew"

i=0  p       left=0 right=1   window "p"     → 1
i=1  w       left=0 right=2   window "pw"    → 2
i=2  w  dup  left=2 right=3   window "w"     → 2
i=3  k       left=2 right=4   window "wk"    → 2
i=4  e       left=2 right=5   window "wke"   → 3   ← best
i=5  w  dup  left=3 right=6   window "kew"   → 3
```

**Time:** O(n) — each index is visited once and `left` only moves forward.
**Space:** O(min(n, k)) for the map, where k is the size of the character set.

### The trap: `left` must never move backwards

The map is never pruned when the window slides, so it keeps stale indices for
characters that have already fallen *outside* the window. Jumping straight to
`left = previousIndex + 1` will therefore sometimes drag `left` **backwards**,
re-admitting characters the window had already excluded:

```
"abba"                        naive              with Math.max

i=0  a                        left=0             left=0
i=1  b                        left=0  "ab" → 2   left=0  "ab" → 2
i=2  b  seen at 1, left=2     left=2  "b"  → 2   left=2  "b"  → 2
i=3  a  seen at 0, left=1     left=1  "bba"→ 3   left=2  "ba" → 2
                                      ^^^^ wrong          ^^^^ correct
```

`"bba"` contains two `b`s. The guard is the whole fix:

```js
left = Math.max(left, previousIndex + 1);
```

Inputs that expose the bug — and that the test suite pins as regressions —
include `"abba"` (2, not 3), `"tmmzuxt"` (5, not 6) and `"abcdb a"` (5, not 6).
The three examples in the problem statement all pass *without* the guard, which
is exactly why it is easy to ship broken.

### Why a `Map` and not a plain object

With a plain `{}`, the membership test `character in chars` also consults
`Object.prototype`, so keys like `"constructor"` and `"toString"` report as
present. Single characters can never collide with those names, so an object
happens to be safe *for this problem* — but `Map` removes the caveat entirely,
takes any string key, and states the "character → index" intent directly.

### Known limitation: astral characters

Indexing a string with `[i]` yields UTF-16 **code units**, not code points. An
emoji outside the Basic Multilingual Plane is two code units, so each half is
counted as its own "character". The stated constraints are English letters,
digits, symbols and spaces, so this never arises for the intended input — but
iterating `[...searchString]` would be the fix if it ever needs to.

### The naive approach, and why it fails

A tempting first attempt tracks a running length and resets the seen-set from
scratch whenever a duplicate appears. It fails because it throws away characters
that should have stayed in the window: on `"abcbdefg"` it resets at the second
`b` and reports 5 (`"bdefg"`), missing the correct answer 6 (`"cbdefg"`). Moving
the left edge — rather than discarding the window — is the point of the pattern.
