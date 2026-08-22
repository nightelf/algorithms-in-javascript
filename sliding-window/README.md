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

## Longest substring without repeating characters

> Given a string `s`, find the longest substring without duplicate characters.
>
> `0 <= s.length <= 5 * 10^4`; `s` consists of English letters, digits, symbols
> and spaces.
> ([LeetCode 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/))

**Files:** [`longest-unique-substring.js`](./longest-unique-substring.js) ·
[`longest-unique-substring.ts`](./longest-unique-substring.ts) ·
[`longest-unique-substring.test.ts`](./longest-unique-substring.test.ts)

Two functions are exported:

| Function | Returns |
| --- | --- |
| `longestUniqueSubstring` | the substring itself — the primary implementation |
| `longestUniqueSubstringLength` | its length; defined as `longestUniqueSubstring(s).length` |

LeetCode only asks for the length, but the substring is the more general
answer: the length is a property of it. Deriving one from the other means the
two can never disagree about which window won.

### How it works

The window `[left, right)` is maintained as an always-duplicate-free range.
A `Map` records, for every character, the **most recent index** at which it was
seen. `leftLongest` and `rightLongest` remember where the best window was.

For each index `i`:

1. If the character was seen before, move `left` past that previous occurrence —
   every window that still contained it would now have a duplicate.
2. Record the character's new index.
3. Advance `right`. If the window is now the biggest seen, record its bounds.

```
"pwwkew"

i=0  p       left=0 right=1   window "p"     → 1   ← best so far
i=1  w       left=0 right=2   window "pw"    → 2   ← best so far
i=2  w  dup  left=2 right=3   window "w"     → 2
i=3  k       left=2 right=4   window "wk"    → 2
i=4  e       left=2 right=5   window "wke"   → 3   ← best, bounds [2, 5)
i=5  w  dup  left=3 right=6   window "kew"   → 3

returns "pwwkew".substring(2, 5) === "wke"
```

Because `right` is always one past the last index in the window, `[leftLongest,
rightLongest)` is already the half-open range `substring` expects — no
off-by-one adjustment.

**Time:** O(n) — each index is visited once and `left` only moves forward.
**Space:** O(min(n, k)) for the map, where k is the size of the character set.

### Trap 1: `left` must never move backwards

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

### Trap 2: `let a, b, c = 0` initialises only `c`

```js
let left, right, leftLongest, rightLongest = 0;
```

This reads as though all four start at `0`. It does not. The `= 0` binds to
`rightLongest` alone — the other three are `undefined`, so `right++` yields
`NaN` and `Math.max(undefined, …)` yields `NaN`. Declare them separately:

```js
let left = 0;
let right = 0;
let leftLongest = 0;
let rightLongest = 0;
```

An omitted declaration is the same class of mistake with a louder failure:
because ES modules are implicitly strict, assigning to an undeclared name
throws `ReferenceError` rather than quietly creating a global.

Both bugs share an unpleasant property — **the empty string still passes**. The
loop never runs, so `substring(undefined, 0)` coerces to `substring(0, 0)` and
returns `""`, which is the correct answer. A suite that led with the
empty-string case would look partly green on a function that threw for every
real input.

### The tie-break: leftmost wins

The comparison is a strict `<`, so a later window of *equal* length never
displaces an earlier one:

```js
if (longest < right - left) {
```

That single character fixes the contract to leftmost, matching how `indexOf`,
`search` and `match` all return the first hit. Switching it to `<=` would
return the rightmost instead: `"aba"` gives `"ba"` rather than `"ab"`.

Note that the tie-break is invisible from `longestUniqueSubstringLength` — every
window tying for longest has the same length by definition. Verified
exhaustively over all 97,656 strings of length 0–7 on the alphabet `"abc !"`:
the two operators return different *substrings* for 39,720 of them and a
different *length* for none.

That also makes many obvious tie inputs useless as tests. `"abcabc"`, `"abab"`
and `"xyzxyz"` return the same thing under both operators, so a tie-break test
built from them passes on a broken implementation. `"aba"`, `"bab"`, `"cbc"` and
`"a 1!b 2"` do discriminate, and are what the suite uses.

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

### What the tests check

Beyond the examples and edge cases, the suite pins properties that a
length-only function cannot express — over 2,000 seeded random strings, the
returned string must contain no repeated characters and must satisfy
`input.includes(result)`. A differential test against a brute-force oracle
covers 5,000 more. The oracle earns its keep: it caught an incorrect
hand-written expectation for `"a 1!b 2"`, where `"a 1!b"` and `"1!b 2"` both
have length 5 and the leftmost must win.

Since `longestUniqueSubstringLength` delegates, the cross-checks between the two
exports now hold by construction. They are kept as regression guards in case the
two are ever split back into independent loops, and labelled as such.
