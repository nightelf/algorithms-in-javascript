# Math

Some problems have a closed form. When the answer follows from an identity
rather than from inspecting the data, the loop that would search for it can be
replaced by arithmetic — often turning O(n log n) or O(n) space into one pass
and a constant.

The pattern applies when:

- the input has **known structure** — a complete run, a fixed range, a known
  total — so something about it can be computed without looking, and
- the answer is the **difference** between what the structure implies and what
  is actually there.

The cost is that the structure becomes a precondition. An input that violates
it does not fail loudly; it produces a plausible number. That trade is the
recurring theme of this folder.

Common relatives: missing/duplicate number, sum of a range, cycle detection by
counting, and the many problems where a Gauss sum or a parity argument removes
a pass.

---

## `findMissingSequentialNumber`

> Given `n` of the `n + 1` consecutive integers from 1, find the one that is
> absent.
>
> ([LeetCode 268](https://leetcode.com/problems/missing-number/), shifted from
> a zero-based run to a one-based one.)

**Files:** [`missingSequentialNumber.js`](./missingSequentialNumber.js) ·
[`missingSequentialNumber.ts`](./missingSequentialNumber.ts) ·
[`missingSequentialNumber.test.ts`](./missingSequentialNumber.test.ts)

```js
findMissingSequentialNumber([1, 2, 4, 5]); // 3
findMissingSequentialNumber([2, 3, 4]);    // 1
findMissingSequentialNumber([1, 2, 3]);    // 4
```

### How it works

The sum of a complete run is known in closed form, so the missing value is
whatever the actual sum falls short by. No sorting, no lookup table, one pass:

```
expected = (n + 1)(n + 2) / 2
missing  = expected - actual
```

```
[1, 2, 4, 5]

n        = 4                 the list holds four values
run      = 1..5              so the complete run is 1..5
expected = 5 * 6 / 2 = 15
actual   = 1 + 2 + 4 + 5 = 12
missing  = 15 - 12 = 3
```

**Time:** O(n), one pass. **Space:** O(1) — nothing is stored.

### The trap: the run is one longer than the list

This is the whole of the arithmetic, and it is easy to get wrong. Summing
`1..m` is `m(m + 1) / 2`, but `m` here is `n + 1`, not `n` — four elements
describe the five values `1..5`.

Using `n * (n + 1) / 2` instead gives the sum of `0..n`, which is the
**zero-based** formulation. It is not merely off by one; it is a different
problem, and one-based input comes back nonsense:

| list | missing | `n(n+1)/2` | `(n+1)(n+2)/2` |
| --- | --- | --- | --- |
| `[1,2,4,5]` | 3 | −2 | **3** |
| `[2,3,4]` | 1 | −3 | **1** |
| `[1,2,3]` | 4 | 0 | **4** |
| `[1,3]` | 2 | −1 | **2** |

A negative result is the giveaway. `[1,2,3] → 0` is the dangerous one — it
looks like an answer.

### Numeric limits

`n(n+1)/2` stays exact up to 134,217,727 elements, well past any array you can
allocate. Verified exact at a run of 1,000,000.

If that ever mattered, the XOR formulation carries no running total and so
cannot overflow at any size: `acc ^= i ^ list[i]`. It is the standard companion
technique, and worth knowing even though the sum version is clearer here.

---

## `isValidSequentialList`

The algorithm above validates nothing. Duplicates, gaps wider than one, values
outside the run, non-integers, and zero-based data all produce quiet nonsense:

```js
findMissingSequentialNumber([1, 1, 2]); // 6  — a duplicate
findMissingSequentialNumber([1, 3, 5]); // 1  — not consecutive
findMissingSequentialNumber([0, 1, 2]); // 7  — zero-based input
```

So the check lives in its own function, to be called when the input is
untrusted and skipped when you built the list yourself:

```js
if (!isValidSequentialList(list)) throw new Error("bad input");
return findMissingSequentialNumber(list);
```

### Why it is separate

It is O(n) time and O(n) space — the same order as the algorithm, and worse in
space, since the algorithm itself stores nothing. Folding it in would roughly
double the work and give up the O(1) space guarantee for every caller, including
the ones who already know their input is sound.

This is the opposite choice from
[`hasValidEnclosingPairs`](../stack/README.md), which validates its delimiter
argument internally and throws. The difference is cost: there, validation is
O(p) on a tiny argument and runs once; here it is O(n) on the main input.

### Why there is no "exactly one is missing" check

It would be redundant. Once the values are known to be integers, within
`1..n+1`, and distinct, **pigeonhole** finishes the argument: `n` distinct
values drawn from a run of `n + 1` must leave exactly one absent. There is no
way to satisfy those three conditions and have zero or two gaps.

The tests check that reasoning rather than trusting it, using an oracle built
the other way round — it removes each value from the complete run and asserts
exactly one remains. Agreement across every array of length 0–4 over the values
`0..5` is evidence the inference holds.

### The ceiling is `n + 1`, not `n`

```js
isValidSequentialList([2]); // true  — the run is 1..2
isValidSequentialList([3]); // false — 3 is past the end of 1..2
```

Same off-by-one as the formula, from the same cause: the run is one longer than
the list.

### The empty list is valid

`[]` describes the run `1..1` with its single value absent, so
`findMissingSequentialNumber([])` is `1`. It reads like a degenerate case but
falls straight out of the contract.

### In TypeScript it is a type predicate

```ts
export const isValidSequentialList = (list: unknown): list is number[] => { … }
```

`unknown` rather than `number[]`, because a validator whose parameter is already
typed as an array cannot tell a TypeScript caller anything it did not assert.
Taking `unknown` and returning a predicate means a successful check narrows the
value for free at the call site.

### What the tests check

Both functions run against the JS and TS mirrors. `findMissingSequentialNumber`
is checked exhaustively — every `1..m` run with each value removed, in every
order, for m up to 7 — plus a run of 1,000,000 for exactness.
`isValidSequentialList` gets duplicates, out-of-range values, non-integers,
non-arrays, and the `n + 1` ceiling, then agrees with the independent oracle
across every array of length 0–4 over `0..5`.

Mutation-checked. Reverting to the zero-based formula fails 18 tests, as does
shifting the run or reversing the subtraction; lowering the ceiling to `n` fails
8; removing the duplicate, integer, lower-bound, or non-array checks fails 7, 6,
5, and 5.
