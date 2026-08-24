# Hash Map

Trade space for time: build a lookup keyed by something you will need to find
again, so a question that would take a scan takes a single probe.

The pattern applies when:

- you keep asking "have I seen X?" or "how many X are there?", and
- X can be derived from the element in front of you — a complement, a
  remainder, a sorted signature — so you know exactly what to look up.

The map turns an inner loop into a constant-time lookup. That is what collapses
an O(n²) "compare everything to everything" solution into O(n).

Common relatives: two-sum and its variants, subarray-sum-equals-k (prefix sums),
group-anagrams (sorted-string keys), first-non-repeating-character.

---

## `twoSumAll`

> Given an array of numbers, find all the pairs of values that add up to a
> target.

**Files:** [`two-sum.js`](./two-sum.js) · [`two-sum.ts`](./two-sum.ts) ·
[`two-sum.test.ts`](./two-sum.test.ts)

Two functions are exported: `twoSumAll` returns every pair, and `twoSumFirst`
returns just the first one it finds. They are separate implementations, not
wrappers — see [below](#twosumfirst) for why.

This is the **find-all-pairs** variant, and it is worth being precise about the
contract, because the name is overloaded:

| | This function | Classic LeetCode Two Sum |
| --- | --- | --- |
| Returns | values | indices |
| How many | every distinct pair | one pair |
| Duplicates | collapsed — `[4,9,4,9]` gives one pair | n/a |

Each pair comes back as `[smaller, larger]`.

### How it works

Two passes:

1. **Count.** Build a `Map` of value → how many times it occurs.
2. **Probe.** Walk the *distinct values* and ask whether each one's complement
   is also in the map.

```
[11, 9, 2, 7, 4, 6]   target 13

counts: {11=>1, 9=>1, 2=>1, 7=>1, 4=>1, 6=>1}

visit 11  complement 2   2 < 11  -> skip, 2 will handle it
visit 9   complement 4   4 < 9   -> skip, 4 will handle it
visit 2   complement 11  present -> emit [2, 11]
visit 7   complement 6   6 < 7   -> skip, 6 will handle it
visit 4   complement 9   present -> emit [4, 9]
visit 6   complement 7   present -> emit [6, 7]

[[2,11], [4,9], [6,7]]
```

**Time:** O(n) — one pass to count, one pass over distinct values (at most n).
**Space:** O(d) where d is the number of distinct values.

### The line that does the most work

```js
if (complement < num) continue;
```

Every pair is discoverable twice — once from each end. This makes the **smaller
half do the emitting** and the larger half defer.

The natural objection: *how do you know the complement exists before skipping?*
You don't, and you don't need to. Both cases are safe:

- **Complement exists** → the pair was already emitted at that value's own
  visit, where the existence check ran. Skipping avoids a duplicate.
- **Complement does not exist** → there is no pair. Skipping emits nothing,
  which is the correct answer regardless.

The invariant: *for any pair `{a, b}` with `a < b`, only the visit to `a` can
emit it.* It cannot duplicate, because `b`'s visit is unconditionally silent. It
cannot miss, because `a` is a distinct value from the array and therefore gets
its own visit. Note the argument never mentions *when* either value is visited —
`Map` iterates in insertion order, not sorted order, so the larger value is
often visited first. It makes no difference. All 120 permutations of
`[4,9,6,7,6]` return the same answer, and the suite asserts it.

That one comparison replaces three things a naive version needs: a `Set` of
already-emitted pair keys, the string keys themselves, and a sort to canonicalise
each pair. Emitting only when `num <= complement` means pairs come out in
ascending order for free.

### Trap 1: checking the wrong side

```js
if (counts.has(num)) {          // always true — invents pairs
if (counts.has(complement)) {   // the actual question
```

`num` came *out of* the array, and `counts` was built *from* the array, so
`counts.has(num)` is a tautology that filters nothing. With it, `[1,2,3]` at
target 13 returns `[[1,12],[11,2],[10,3]]` — pairs made from numbers that are
not in the input.

### Trap 2: self-pairing needs two positions, not two equal values

```js
if (complement === num) {
  if (count > 1) sums.push([num, num]);
}
```

`[6]` at target 12 must return nothing; `[6, 6]` must return `[[6, 6]]`. One
element cannot pair with itself, but two elements that happen to share a value
can. That is what `count > 1` is checking.

This is also why the skip above is a strict `<` and not `<=`. When
`complement === num`, `6 < 6` is false, so the self-pair falls through to this
branch. Change it to `<=` and every self-pair silently disappears — a one
character difference.

**Odd targets never reach this branch.** For target 13 there is no `x` where
`x === 13 - x`. So the entire self-pairing case is dead code under the original
problem, and only wakes up when someone passes an even target. The tests use 12
deliberately for this reason.

### Trap 3: `[3, 10].sort()` is `[10, 3]`

If you do canonicalise pairs by sorting them, the default comparator stringifies
first, so `"10" < "3"` and multi-digit values come back reversed. It needs
`.sort((a, b) => a - b)`.

The better fix is to not sort at all — the `complement < num` skip already
guarantees ascending order, so the sort was doing work the loop structure gives
away.

### Why a count map rather than a `Set`

A single pass with a `Set` and check-before-insert also works, and handles
self-pairing with no special case at all. The count map wins anyway:

| n | `Set` version | count map |
| --- | --- | --- |
| 100,000 (many duplicates) | 4.96 ms | **3.06 ms** |
| 1,000,000 (many duplicates) | 47.93 ms | **27.11 ms** |
| 1,000,000 (few duplicates) | 99.81 ms | **97.18 ms** |

The `Set` version does two set operations per element and then re-walks the
whole array; the count map does one map operation per element and then walks
*distinct values only*. The more duplicates, the bigger the gap. Worst case it
ties — it never loses.

It is also strictly more capable: the counts you already have give
multiplicities for free, so "how many index-pairs sum to 13" is
`k * (k - 1) / 2` for self-pairs and `k₁ * k₂` otherwise, with no extra pass.
That matters, because enumerating index-pairs is O(n²) output — 5,000 copies of
`6` at target 12 produce 12,497,500 of them.

The cost of the count map is that self-pairing becomes an explicit branch
instead of falling out for free. See Trap 2.

### Why not two pointers

Sorting and converging from both ends solves the same problem with O(1)
auxiliary space. On unsorted input the hash map is roughly 3× faster, because
the sort dominates:

| n | hash map | two pointers | two pointers, pre-sorted |
| --- | --- | --- | --- |
| 100,000 | **7.4 ms** | 21.2 ms | 1.4 ms |
| 1,000,000 | **97.0 ms** | 257.2 ms | 13.7 ms |

Note the last column. The two-pointer *scan* is far faster than hashing — it is
a linear walk with excellent cache locality. It just usually has to pay
O(n log n) up front to get the sorted input it needs. If your data is already
sorted, or memory is tight, two pointers is the better choice.

### Known limitation: `NaN`

`Map` keys use SameValueZero, under which `NaN` equals itself. So a lone `NaN`
with a target of `NaN` satisfies `counts.has(complement)` and reports a bogus
`[NaN, NaN]` pair from a single element. Real numeric input never hits this, and
guarding it would cost a comparison on every iteration, so it is documented
rather than handled.

The same rule makes `0` and `-0` a single key, which is correct here: `[0, -0]`
at target 0 is two genuine positions and does return `[[0, 0]]`.

### What the tests check

Beyond examples and edge cases, the suite pins four structural properties over
2,000 seeded random arrays: every returned pair sums to the target, every pair
is ordered `[smaller, larger]`, no pair is returned twice, and both members of
every pair genuinely exist in the input — counted twice over for self-pairs. A
differential test against a brute-force oracle runs at five targets including
`0` and a negative, and the order-independence check runs all 120 permutations
of a fixed array.


---

## `twoSumFirst`

> Return the first pair that sums to the target, or `null` if there is none.

```js
export const twoSumFirst = (intArray, targetSum) => {
  const seen = new Set();

  for (const num of intArray) {
    const complement = targetSum - num;
    if (seen.has(complement)) {
      return [Math.min(num, complement), Math.max(num, complement)];
    }
    seen.add(num);
  }

  return null;
};
```

### "First" means first to *complete*

The pair returned is whichever one's **second** member appears soonest — not
the leftmost pair by first element. Same contents, different order, different
answer, and both are correct:

```
[9, 4, 6, 7]  target 13 -> [4, 9]    completes at index 1
[6, 7, 4, 9]  target 13 -> [6, 7]    completes at index 1
```

This is inherent to a single pass: at each element you can only see what came
before it, so the first pair you can possibly know about is the first one whose
second half you reach.

### `null`, never `[]`

An empty array is **truthy** in JavaScript, so returning `[]` for a miss would
make `if (twoSumFirst(...))` fire when nothing was found. Returning `null`
makes the truthiness check safe — and a real pair is always truthy, including
`[0, 0]`, since arrays are objects.

### Why not derived from `twoSumAll`

Because `twoSumAll` cannot answer early. Its first pass builds the whole count
map before the second pass can find anything, so the O(n) cost is paid in full
before the first pair is even visible.

The tempting fix — passing a flag into `twoSumAll` and `break`ing out of the
second loop on the first hit — does not help, and it is worth understanding
why. The second loop walks *distinct values*, which on a million-element array
of a thousand distinct numbers is a thousand iterations. Breaking early
short-circuits 0.1% of the work. Measured at n = 1,000,000:

| scenario | `twoSumAll().length > 0` | with a `firstOnly` flag | as a generator | single pass |
| --- | --- | --- | --- | --- |
| pair at 0.001% | 37.4 ms | 39.5 ms | 39.3 ms | **0.0 ms** |
| pair at 25% | 31.8 ms | 32.5 ms | 33.3 ms | **12.9 ms** |
| pair at 50% | 31.6 ms | 31.6 ms | 31.6 ms | **25.5 ms** |
| pair at 99% | **31.6 ms** | 31.6 ms | 31.7 ms | 51.0 ms |
| no pair | 31.9 ms | **31.6 ms** | 31.7 ms | 50.9 ms |

The flag and the generator are both indistinguishable from doing nothing. Only
the single pass wins, and it wins by **never building the map** — a different
algorithm, not a parameterisation of the existing one. Hence a separate
function rather than an option.

### The trade

Short-circuiting is not free. The single pass does two set operations per
element (`has`, then `add`), where the count map does one. When the pair is
late or absent it scans everything anyway and comes out ~1.6× slower.

So `twoSumFirst` is the right default — enormous wins on early hits, a bounded
loss on misses — but if you know your data rarely contains a pair, `twoSumAll`
is the better existence check. That is an unusual thing to know, which is why
it is not the default.

### Self-pairing, for free

There is no `count > 1` branch here. The lookup happens **before** the insert,
so `seen` only ever holds elements from earlier in the array — a value can
never match itself, but a second copy of it matches the first:

```
[6]     target 12 -> null     6 looks for 6, set is empty
[6, 6]  target 12 -> [6, 6]   the second 6 finds the first
```

Reverse those two lines and both break at once: `[6]` would report a pair from
a single element. The suite pins this with a mutation-checked regression block.

This is the trade named in the count-map section, seen from the other side.
Walking every element gives self-pairing free and costs a dedup structure;
walking distinct values gives dedup free and costs the `count > 1` branch.
