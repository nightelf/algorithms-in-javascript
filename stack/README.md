# Stack

Push work onto a stack when you meet something that must be resolved later, and
pop when the thing that resolves it arrives. The stack's LIFO order is the point:
the most recently opened obligation is always the one that has to close first.

The pattern applies when:

- the structure is **nested** rather than merely sequential, and
- correctness depends on *what is still open*, not just on what you have seen.

A counter can tell you there are as many `(` as `)`. Only a stack can tell you
they are in the right order — `([)]` has balanced counts and is still wrong.

Common relatives: valid parentheses, expression evaluation and infix-to-postfix,
the monotonic-stack problems (next greater element, largest rectangle in a
histogram), and undo/redo.

---

## `hasValidEnclosingPairs`

> Given a string, decide whether every opening character is closed by its
> matching character, in the right order. Characters outside the delimiter set
> are ignored.
>
> ([LeetCode 20](https://leetcode.com/problems/valid-parentheses/), generalised
> to arbitrary delimiter pairs.)

**Files:** [`valid-enclosing-pairs.js`](./valid-enclosing-pairs.js) ·
[`valid-enclosing-pairs.ts`](./valid-enclosing-pairs.ts) ·
[`valid-enclosing-pairs.test.ts`](./valid-enclosing-pairs.test.ts)

```js
hasValidEnclosingPairs("([{}])")           // true
hasValidEnclosingPairs("([)]")             // false
hasValidEnclosingPairs("fn(x) { [1, 2] }") // true — other characters ignored
hasValidEnclosingPairs("<a>", "<>")        // true — custom delimiters
```

### How it works

Two lookups are derived from the `enclosingPairs` string: opener → closer, and
closer → opener. Then one pass:

1. An **opener** is pushed onto the stack.
2. A **closer** pops, and the popped value must be the opener that this closer
   expects. If it is not, the string is invalid.
3. Anything else is ignored.

At the end, the stack must be empty.

```
"([{}])"

(   push        stack: (
[   push        stack: ( [
{   push        stack: ( [ {
}   pop -> {    matches, stack: ( [
]   pop -> [    matches, stack: (
)   pop -> (    matches, stack:
                stack empty -> true
```

**Time:** O(n) — one pass, O(1) work per character.
**Space:** O(n) worst case, for a string that is entirely openers.

### Two things that need no special case

**A closer arriving with nothing open.** `stack.pop()` on an empty array returns
`undefined`. Since `close.get(char)` is always a real character whenever
`close.has(char)` is true, the comparison simply fails. `")"` returns `false`
with no explicit empty-stack test.

**Counting.** There is no counter anywhere. The stack's depth *is* the count,
and its contents carry the ordering a counter would throw away.

### The trap: the final check belongs after the loop

The natural mistake is to put it inside:

```js
for (const char of testString) {
  if (open.has(char)) { stack.push(char); continue; }
  else if (close.has(char)) { /* ... */ continue; }
  else { continue; }

  return stack.length === 0;   // unreachable
}
```

Every branch of the chain ends in `continue` or `return`, so the last line can
never run — and with no return after the loop, the function falls off the end
and yields `undefined`. The symptom is nastier than a throw:

| input | returns | should be |
| --- | --- | --- |
| `"()"` | `undefined` | `true` |
| `"(("` | `undefined` | `false` |
| `"(]"` | `false` | `false` |

Mismatched closers are still caught, so the function looks half-working.
And because `undefined` is falsy, `if (hasValidEnclosingPairs(s))` gives the
*right* answer for `"((("` while being wrong for `"()"`.

"Is anything still open?" is a question about the **end state**, not about any
single character, so it belongs after the loop. The suite pins this with
`"()"` → `true` alongside `"((("` → `false`; the first alone would not catch it.

### Validating `enclosingPairs`

Because the delimiter set is a parameter, it is worth checking. Three
conditions, each an independent `if` so that fixing one does not hide the next:

```js
if (chars.length === 0)                       throw new Error("Enclosing pairs required");
if (chars.length % 2 !== 0)                   throw new Error("Must have both opening and closing character for each pair");
if (new Set(chars).size !== chars.length)     throw new Error("Enclosing pair characters must all be distinct");
```

The distinctness check earns its place by collapsing four separate
malformations into one question — *does any character appear twice?*

| input | what is wrong | caught by a per-pair check? |
| --- | --- | --- |
| `'""'` | same character on both sides of a pair | yes |
| `'()(('` | `(` is an opener in two pairs | incidentally |
| `'()){'` | `)` is both a closer and an opener | **no** |
| `'()[)'` | `)` is a closer in two pairs | **no** |

Comparing only `chars[i]` against `chars[i + 1]` looks equivalent but misses the
last two: neither has a pair whose halves match, so both slip through, silently
overwrite a map entry, and make `"()"` report `false`.

**Throw, do not return `false`.** A malformed delimiter set is a bug in the
caller's argument, not a property of `testString`. Returning `false` would
conflate "your delimiters are broken" with "this string is unbalanced" — which
is exactly the silent-wrong-answer failure mode the validation exists to remove.

### Code points, not code units

`enclosingPairs` is spread into an array first:

```js
const chars = [...enclosingPairs];
```

Without it, the two measurements disagree. `.length` counts UTF-16 **code
units**; `Set` iterates **code points**:

| pairs | `.length` | `new Set(…).size` | distinctness check |
| --- | --- | --- | --- |
| `'(){}[]'` | 6 | 6 | ok |
| `'🔒🔓'` | 4 | 2 | **rejected — wrongly** |
| `'«»'` | 2 | 2 | ok |
| `'「」'` | 2 | 2 | ok |

Two distinct emoji get rejected as duplicates. Worse, `enclosingPairs[0]` on an
astral character is a lone surrogate — half a character — so the map would be
keyed on garbage. Only astral-plane characters break; guillemets and CJK
brackets are BMP and were always fine.

The spread also makes the two halves of the function agree: the scan already
iterates `testString` with `for…of`, which is code-point based.

### Building the lookups once

`DEFAULT_LOOKUPS` is built at module load rather than per call. Validating and
building two `Map`s costs more than scanning a short string, so rebuilding it
every time roughly doubles the work when checking many small inputs:

| input size | rebuilt per call | hoisted |
| --- | --- | --- |
| 8 characters | 0.79 ms | **0.37 ms** |
| 200 characters | 7.63 ms | **6.99 ms** |

(2,000 balanced strings per run.) By 200 characters the scan dominates and it
stops mattering. Custom delimiter sets are still validated and built on every
call — they are rare, and caching them would need a keyed cache that could grow
without bound.

### What the tests check

Balanced and mismatched cases, unclosed openers, closers with nothing open,
ignored characters, custom and astral delimiters, and one test per validation
throw. A differential fuzz runs 5,000 seeded strings against a reference
implementation at both default and custom delimiters.

The suite is mutation-checked. Restoring the original unreachable-return
structure fails 34 tests; swapping the opener and closer maps fails 24;
inverting the final check fails 34; dropping the spread or the distinctness
check fails 5 each.
