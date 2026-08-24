import { describe, it, expect } from "vitest";

import { twoSumAll as jsTwoSumAll, twoSumFirst as jsTwoSumFirst } from "./two-sum.js";
import { twoSumAll as tsTwoSumAll, twoSumFirst as tsTwoSumFirst } from "./two-sum.ts";

type Implementation = (intArray: number[], targetSum: number) => number[][];

/**
 * O(n^2) oracle. Obviously correct, far too slow for real input — its only job
 * is to say what the map-based version should have produced. It works over
 * index pairs, then collapses to distinct value pairs.
 */
const bruteForce: Implementation = (intArray, targetSum) => {
  const found = new Set<string>();

  for (let i = 0; i < intArray.length; i++) {
    for (let j = i + 1; j < intArray.length; j++) {
      if (intArray[i] + intArray[j] === targetSum) {
        const low = Math.min(intArray[i], intArray[j]);
        const high = Math.max(intArray[i], intArray[j]);
        found.add(`${low},${high}`);
      }
    }
  }

  return [...found].map((entry) => entry.split(",").map(Number));
};

/** Order-insensitive comparison — the contract is a set of pairs, not a list. */
const normalise = (pairs: number[][]) =>
  [...pairs].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/** Seeded PRNG (mulberry32) so a fuzz failure always reproduces. */
const createRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomArrays = (seed: number, count: number, maxLength: number, spread: number) => {
  const random = createRandom(seed);
  const arrays: number[][] = [];

  for (let trial = 0; trial < count; trial++) {
    const length = Math.floor(random() * (maxLength + 1));
    const array: number[] = [];
    for (let k = 0; k < length; k++) {
      array.push(Math.floor(random() * spread) - Math.floor(spread / 4));
    }
    arrays.push(array);
  }

  return arrays;
};

const implementations: ReadonlyArray<[string, Implementation]> = [
  ["JavaScript", jsTwoSumAll],
  ["TypeScript", tsTwoSumAll],
];

describe.each(implementations)("twoSumAll (%s)", (_name, twoSumAll) => {
  describe("finds the pairs that exist", () => {
    it("finds a single pair", () => {
      expect(normalise(twoSumAll([4, 9], 13))).toEqual([[4, 9]]);
    });

    it("finds several pairs", () => {
      expect(normalise(twoSumAll([11, 9, 2, 7, 4, 6], 13))).toEqual([
        [2, 11],
        [4, 9],
        [6, 7],
      ]);
    });

    it("ignores values whose complement is absent", () => {
      expect(normalise(twoSumAll([1, 4, 9, 20], 13))).toEqual([[4, 9]]);
    });
  });

  describe("edge cases", () => {
    it("returns nothing for an empty array", () => {
      expect(twoSumAll([], 13)).toEqual([]);
    });

    it("returns nothing for a single element", () => {
      expect(twoSumAll([4], 13)).toEqual([]);
    });

    it("returns nothing when no pair sums to the target", () => {
      expect(twoSumAll([1, 2, 3], 13)).toEqual([]);
    });

    it("handles a target of zero", () => {
      expect(normalise(twoSumAll([-3, 0, 3, 5], 0))).toEqual([[-3, 3]]);
    });

    it("handles negative numbers", () => {
      expect(normalise(twoSumAll([-3, 16, 20, -7], 13))).toEqual([[-7, 20], [-3, 16]]);
    });
  });

  describe("regression: the complement must actually be present", () => {
    // Checking `counts.has(num)` instead of `counts.has(complement)` is a
    // tautology — num always exists, since counts was built from the array.
    // It invents pairs out of numbers that are not there.
    it.each([
      [[1, 2, 3], 13],
      [[5, 5, 5], 13],
      [[9, 1, 2], 13],
    ])("%j at target %i yields no pairs", (input, target) => {
      expect(twoSumAll(input, target)).toEqual([]);
    });
  });

  describe("regression: each distinct pair appears exactly once", () => {
    it.each([
      [[4, 9, 4, 9], 13],
      [[4, 9, 4, 9, 4, 9, 9], 13],
      [[6, 7, 6, 7, 6], 13],
    ])("%j at target %i yields one pair", (input, target) => {
      expect(twoSumAll(input, target)).toHaveLength(1);
    });
  });

  describe("regression: pairs come back as [smaller, larger]", () => {
    // A default `.sort()` on the pair sorts lexicographically, so [3, 10]
    // becomes [10, 3]. Multi-digit values are what expose it.
    it.each([
      [[3, 10], 13, [3, 10]],
      [[10, 3], 13, [3, 10]],
      [[2, 11], 13, [2, 11]],
      [[11, 2], 13, [2, 11]],
      [[-7, 20], 13, [-7, 20]],
    ])("%j at target %i → %j", (input, target, expected) => {
      expect(twoSumAll(input, target)).toEqual([expected]);
    });
  });

  describe("self-pairing needs two positions, not two equal values", () => {
    it("does not pair a lone value with itself", () => {
      expect(twoSumAll([6], 12)).toEqual([]);
    });

    it("does not pair a lone value with itself among others", () => {
      expect(normalise(twoSumAll([6, 1, 2], 12))).toEqual([]);
    });

    it("pairs a value with itself when it appears twice", () => {
      expect(normalise(twoSumAll([6, 6], 12))).toEqual([[6, 6]]);
    });

    it("still reports it once when it appears three times", () => {
      expect(normalise(twoSumAll([6, 6, 6], 12))).toEqual([[6, 6]]);
    });

    it("reports a self-pair alongside ordinary pairs", () => {
      expect(normalise(twoSumAll([6, 6, 5, 7], 12))).toEqual([[5, 7], [6, 6]]);
    });

    it("never fires for an odd target, which cannot have one", () => {
      expect(normalise(twoSumAll([6, 6, 6], 13))).toEqual([]);
    });
  });

  describe("the answer does not depend on input order", () => {
    const permutations = (values: number[]): number[][] =>
      values.length <= 1
        ? [values]
        : values.flatMap((value, index) =>
            permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
              value,
              ...rest,
            ]),
          );

    it("every permutation of [4,9,6,7,6] at target 13 gives the same answer", () => {
      const answers = new Set(
        permutations([4, 9, 6, 7, 6]).map((input) => JSON.stringify(normalise(twoSumAll(input, 13)))),
      );
      expect([...answers]).toEqual([JSON.stringify([[4, 9], [6, 7]])]);
    });
  });

  describe("structural properties hold for every input", () => {
    const arrays = randomArrays(20260824, 2000, 14, 20);
    const target = 13;

    it("every returned pair sums to the target", () => {
      const offenders = arrays.filter((input) =>
        twoSumAll(input, target).some(([a, b]) => a + b !== target),
      );
      expect(offenders).toEqual([]);
    });

    it("every returned pair is ordered [smaller, larger]", () => {
      const offenders = arrays.filter((input) => twoSumAll(input, target).some(([a, b]) => a > b));
      expect(offenders).toEqual([]);
    });

    it("no pair is returned twice", () => {
      const offenders = arrays.filter((input) => {
        const pairs = twoSumAll(input, target);
        return new Set(pairs.map((pair) => pair.join(","))).size !== pairs.length;
      });
      expect(offenders).toEqual([]);
    });

    it("both members of every pair are actually present in the input", () => {
      const offenders = arrays.filter((input) =>
        twoSumAll(input, target).some(([a, b]) =>
          a === b ? input.filter((n) => n === a).length < 2 : !input.includes(a) || !input.includes(b),
        ),
      );
      expect(offenders).toEqual([]);
    });
  });

  describe("agrees with a brute-force oracle", () => {
    it.each([11, 12, 13, 0, -4])("on 2000 seeded random arrays at target %i", (target) => {
      const mismatches = randomArrays(31337 + target, 2000, 12, 18)
        .map((input) => ({
          input,
          actual: normalise(twoSumAll(input, target)),
          expected: normalise(bruteForce(input, target)),
        }))
        .filter(({ actual, expected }) => JSON.stringify(actual) !== JSON.stringify(expected));

      expect(mismatches).toEqual([]);
    });
  });

  describe("scales", () => {
    it("stays linear on a 100000-element array", () => {
      const input = Array.from({ length: 100_000 }, (_, i) => i % 500);
      // values 0..499; pairs summing to 13 are (0,13)...(6,7) — seven of them
      expect(normalise(twoSumAll(input, 13))).toEqual([
        [0, 13],
        [1, 12],
        [2, 11],
        [3, 10],
        [4, 9],
        [5, 8],
        [6, 7],
      ]);
    });
  });
});

describe("the JavaScript and TypeScript mirrors stay in lockstep", () => {
  it("produce identical output on 2000 seeded random arrays", () => {
    const arrays = randomArrays(7, 2000, 16, 22);
    const mismatches = arrays.filter(
      (input) =>
        JSON.stringify(normalise(tsTwoSumAll(input, 13))) !==
        JSON.stringify(normalise(jsTwoSumAll(input, 13))),
    );
    expect(mismatches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// twoSumFirst — first completing pair, short-circuiting
// ---------------------------------------------------------------------------

type FirstFinder = (intArray: number[], targetSum: number) => [number, number] | null;

const finders: ReadonlyArray<[string, FirstFinder]> = [
  ["JavaScript", jsTwoSumFirst],
  ["TypeScript", tsTwoSumFirst],
];

describe.each(finders)("twoSumFirst (%s)", (_name, twoSumFirst) => {
  describe("basic answers", () => {
    it.each([
      [[4, 9], 13, [4, 9]],
      [[1, 4, 9, 20], 13, [4, 9]],
      [[-3, 16], 13, [-3, 16]],
      [[-3, 0, 3], 0, [-3, 3]],
    ])("%j at target %i → %j", (input, target, expected) => {
      expect(twoSumFirst(input, target)).toEqual(expected);
    });
  });

  describe("returns null — never [] — when there is no pair", () => {
    // An empty array is truthy in JavaScript, so returning [] would make
    // `if (twoSumFirst(...))` fire on a miss.
    it.each([
      [[1, 2, 3], 13],
      [[], 13],
      [[13], 13],
      [[6], 12],
      [[6, 1, 2], 12],
    ])("%j at target %i → null", (input, target) => {
      expect(twoSumFirst(input, target)).toBeNull();
    });

    it("a miss is falsy and a hit is truthy, including a [0,0] pair", () => {
      expect(twoSumFirst([1, 2, 3], 13)).toBeFalsy();
      expect(twoSumFirst([4, 9], 13)).toBeTruthy();
      expect(twoSumFirst([0, 0], 0)).toEqual([0, 0]);
      expect(twoSumFirst([0, 0], 0)).toBeTruthy();
    });
  });

  describe("returns the pair that COMPLETES first, not the leftmost", () => {
    // Same contents, different order, different answer — both correct.
    it.each([
      [[9, 4, 6, 7], 13, [4, 9]],
      [[6, 7, 4, 9], 13, [6, 7]],
      [[4, 100, 9, 13, 0], 13, [4, 9]],
      [[1, 12, 4, 9], 13, [1, 12]],
      [[11, 2, 4, 9], 13, [2, 11]],
    ])("%j at target %i → %j", (input, target, expected) => {
      expect(twoSumFirst(input, target)).toEqual(expected);
    });
  });

  describe("results are ordered [smaller, larger], matching twoSumAll", () => {
    it.each([
      [[10, 3], 13],
      [[3, 10], 13],
      [[20, -7], 13],
      [[-7, 20], 13],
    ])("%j at target %i comes back ascending", (input, target) => {
      const pair = twoSumFirst(input, target);
      expect(pair).not.toBeNull();
      expect(pair![0]).toBeLessThanOrEqual(pair![1]);
    });
  });

  describe("self-pairing falls out of check-before-insert", () => {
    // No `count > 1` branch exists here. The lookup precedes the insert, so
    // `seen` holds only earlier elements and a value cannot match itself.
    it.each([
      [[6], 12, null],
      [[6, 1, 2], 12, null],
      [[6, 6], 12, [6, 6]],
      [[6, 6, 6], 12, [6, 6]],
      [[6, 6, 6], 13, null],
    ])("%j at target %i → %j", (input, target, expected) => {
      expect(twoSumFirst(input, target)).toEqual(expected);
    });
  });

  describe("short-circuits without scanning the rest", () => {
    it("finds a pair at the front of a huge array", () => {
      const input = [4, 9, ...Array.from({ length: 200_000 }, () => 500)];
      expect(twoSumFirst(input, 13)).toEqual([4, 9]);
    });

    it("still finds a pair sitting at the very end", () => {
      const input = [...Array.from({ length: 200_000 }, () => 500), 4, 9];
      expect(twoSumFirst(input, 13)).toEqual([4, 9]);
    });
  });

  describe("stays consistent with twoSumAll", () => {
    it.each([11, 12, 13, 0, -4])(
      "finds a pair exactly when twoSumAll finds one, at target %i",
      (target) => {
        const mismatches = randomArrays(31337 + target, 2000, 12, 18).filter(
          (input) =>
            (twoSumFirst(input, target) !== null) !== (jsTwoSumAll(input, target).length > 0),
        );
        expect(mismatches).toEqual([]);
      },
    );

    it("returns a pair that twoSumAll also reports", () => {
      const offenders = randomArrays(4242, 2000, 12, 18).filter((input) => {
        const pair = twoSumFirst(input, 13);
        if (pair === null) return false;
        return !jsTwoSumAll(input, 13).some(([a, b]) => a === pair[0] && b === pair[1]);
      });
      expect(offenders).toEqual([]);
    });

    it("agrees with the brute-force oracle on existence", () => {
      const mismatches = randomArrays(909, 2000, 12, 18).filter(
        (input) => (twoSumFirst(input, 13) !== null) !== (bruteForce(input, 13).length > 0),
      );
      expect(mismatches).toEqual([]);
    });
  });
});

describe("twoSumFirst mirrors stay in lockstep", () => {
  it("produce identical output on 2000 seeded random arrays", () => {
    const arrays = randomArrays(7, 2000, 16, 22);
    const mismatches = arrays.filter(
      (input) =>
        JSON.stringify(tsTwoSumFirst(input, 13)) !== JSON.stringify(jsTwoSumFirst(input, 13)),
    );
    expect(mismatches).toEqual([]);
  });
});
