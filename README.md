# algorithms-in-javascript

A compendium of reference algorithms in JavaScript and TypeScript.

Each algorithm **family** gets its own folder. Inside it, every algorithm is
implemented twice — once in plain JavaScript and once in TypeScript — and both
copies are exercised by the same test suite, so the two can never quietly drift
apart.

```
<algorithm-family>/
├── README.md                  explains the pattern and each function in the folder
├── <algorithm>.js             the JavaScript implementation
├── <algorithm>.ts             the TypeScript mirror
└── <algorithm>.test.ts        one suite, run against both implementations
```

## Contents

| Family | Algorithm | Complexity |
| --- | --- | --- |
| [Sliding Window](./sliding-window) | [`longestUniqueSubstring`](./sliding-window/longest-unique-substring.ts) — longest substring without repeating characters, leftmost on ties | O(n) time, O(min(n, k)) space |
| [Sliding Window](./sliding-window) | [`longestUniqueSubstringLength`](./sliding-window/longest-unique-substring.ts) — its length, delegating to the above | O(n) time, O(min(n, k)) space |
| [Hash Map](./hash-map) | [`twoSumAll`](./hash-map/two-sum.ts) — all distinct value pairs summing to a target | O(n) time, O(d) space |
| [Hash Map](./hash-map) | [`twoSumFirst`](./hash-map/two-sum.ts) — the first pair summing to a target, or null, short-circuiting | O(k) to the first hit, O(n) worst case |
| [Stack](./stack) | [`hasValidEnclosingPairs`](./stack/valid-enclosing-pairs.ts) — whether nested delimiters are balanced and correctly ordered | O(n) time, O(n) space |

## Getting started

Requires Node 22 (pinned in [`.nvmrc`](./.nvmrc)).

```bash
nvm use && npm install
```

## Running the tests

```bash
npm test
```

```bash
npm run test:watch
```

```bash
npm run typecheck
```

## Testing setup

Tests use [Vitest](https://vitest.dev). It was chosen over Jest because this
repo keeps a `.js` and a `.ts` copy of every algorithm side by side: Vitest runs
TypeScript natively, so a single `.test.ts` file can import both implementations
with no `ts-jest`, Babel, or transform configuration in between. The API
(`describe` / `it` / `expect`) is the same one Jest uses, so nothing here is
Jest-specific knowledge.

## Conventions for a new algorithm

Beyond the file layout above, each suite is expected to cover:

- the examples from the original problem statement,
- edge cases — empty input, single element, all-identical elements,
- **regression cases**: the specific inputs that break the obvious-but-wrong
  version of the algorithm, with a comment saying what they catch,
- a differential test against a brute-force oracle over seeded random input, so
  a failure always reproduces,
- input at the problem's stated size limit.

The folder README should say not just how the algorithm works, but where it is
easy to get wrong — the counterexample is usually the most useful thing on the
page.
