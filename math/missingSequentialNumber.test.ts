import { describe, it, expect } from "vitest";

import {
  findMissingSequentialNumber as jsFind,
  isValidSequentialList as jsIsValid,
} from "./missingSequentialNumber.js";
import {
  findMissingSequentialNumber as tsFind,
  isValidSequentialList as tsIsValid,
} from "./missingSequentialNumber.ts";

type Finder = (list: number[]) => number;
type Validator = (list: unknown) => boolean;

/**
 * Independent oracle, built the opposite way round: remove each value from the
 * complete run and see what is left. Where the implementation reasons from
 * pigeonhole, this checks "exactly one absent" directly.
 */
const oracle = (list: unknown): { valid: boolean; missing: number | null } => {
  if (!Array.isArray(list)) return { valid: false, missing: null };

  const remaining = new Set(Array.from({ length: list.length + 1 }, (_, i) => i + 1));
  for (const value of list) {
    if (!Number.isInteger(value)) return { valid: false, missing: null };
    if (!remaining.has(value)) return { valid: false, missing: null }; // out of range, or reused
    remaining.delete(value);
  }

  return remaining.size === 1 ? { valid: true, missing: [...remaining][0] } : { valid: false, missing: null };
};

/** Every permutation of `values`. */
const permutations = (values: number[]): number[][] =>
  values.length <= 1
    ? [values]
    : values.flatMap((value, index) =>
        permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
          value,
          ...rest,
        ]),
      );

/** Every 1..m run with one value removed, in every order, for m up to `maxRun`. */
const everyValidList = (maxRun: number) => {
  const cases: Array<{ list: number[]; missing: number }> = [];
  for (let m = 1; m <= maxRun; m++) {
    const full = Array.from({ length: m }, (_, i) => i + 1);
    for (const missing of full) {
      for (const list of permutations(full.filter((v) => v !== missing))) cases.push({ list, missing });
    }
  }
  return cases;
};

const finders: ReadonlyArray<[string, Finder]> = [
  ["JavaScript", jsFind],
  ["TypeScript", tsFind],
];

const validators: ReadonlyArray<[string, Validator]> = [
  ["JavaScript", jsIsValid],
  ["TypeScript", tsIsValid],
];

// ---------------------------------------------------------------------------
// findMissingSequentialNumber
// ---------------------------------------------------------------------------

describe.each(finders)("findMissingSequentialNumber (%s)", (_name, findMissingSequentialNumber) => {
  describe("finds the absent value", () => {
    it.each([
      [[1, 2, 4, 5], 3],
      [[2, 3, 4], 1],
      [[1, 2, 3], 4],
      [[1, 3], 2],
      [[2], 1],
      [[1], 2],
    ])("%j → %i", (list, expected) => {
      expect(findMissingSequentialNumber(list)).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("returns 1 for an empty list — the run is just [1], and it is absent", () => {
      expect(findMissingSequentialNumber([])).toBe(1);
    });

    it("finds the first value of the run", () => {
      expect(findMissingSequentialNumber([2, 3, 4, 5])).toBe(1);
    });

    it("finds the last value of the run", () => {
      expect(findMissingSequentialNumber([1, 2, 3, 4])).toBe(5);
    });

    it("does not care about order", () => {
      expect(findMissingSequentialNumber([5, 1, 4, 2])).toBe(3);
      expect(findMissingSequentialNumber([2, 4, 1, 5])).toBe(3);
    });
  });

  describe("regression: the run is one longer than the list", () => {
    // Using n * (n + 1) / 2 — the sum of 0..n — makes this 0-based and returns
    // nonsense for 1-based input: [1,2,4,5] would give -2 rather than 3.
    it.each([
      [[1, 2, 4, 5], 3],
      [[1, 2, 3], 4],
      [[1], 2],
    ])("%j → %i, not the 0-based answer", (list, expected) => {
      expect(findMissingSequentialNumber(list)).toBe(expected);
    });
  });

  describe("agrees with the oracle exhaustively", () => {
    it("on every 1..m run with one value removed, in every order, m up to 7", () => {
      const cases = everyValidList(7);
      const mismatches = cases.filter(({ list, missing }) => findMissingSequentialNumber(list) !== missing);
      expect(cases.length).toBeGreaterThan(5000);
      expect(mismatches).toEqual([]);
    });
  });

  describe("scales", () => {
    it("stays exact on a run of 1,000,000", () => {
      const list: number[] = [];
      for (let value = 1; value <= 1_000_000; value++) if (value !== 618_034) list.push(value);
      expect(findMissingSequentialNumber(list)).toBe(618_034);
    });
  });
});

// ---------------------------------------------------------------------------
// isValidSequentialList
// ---------------------------------------------------------------------------

describe.each(validators)("isValidSequentialList (%s)", (_name, isValidSequentialList) => {
  describe("accepts lists that satisfy the contract", () => {
    it.each([[[1, 2, 4, 5]], [[2, 3, 4]], [[1, 2, 3]], [[1]], [[2]], [[]], [[5, 1, 4, 2]]])(
      "%j is valid",
      (list) => {
        expect(isValidSequentialList(list)).toBe(true);
      },
    );
  });

  describe("rejects duplicates", () => {
    it.each([[[1, 1, 2]], [[1, 1]], [[2, 2, 2]], [[1, 2, 2, 4]]])("%j is invalid", (list) => {
      expect(isValidSequentialList(list)).toBe(false);
    });
  });

  describe("rejects values outside 1..n+1", () => {
    it.each([[[0, 1, 2]], [[1, 3, 5]], [[3]], [[-1]], [[1, 2, 9]]])("%j is invalid", (list) => {
      expect(isValidSequentialList(list)).toBe(false);
    });

    it("uses n+1 as the ceiling, not n", () => {
      expect(isValidSequentialList([2])).toBe(true); // run is 1..2
      expect(isValidSequentialList([3])).toBe(false); // 3 is past the end of 1..2
    });
  });

  describe("rejects anything that is not an integer", () => {
    it.each([[[1.5]], [[Number.NaN]], [[Number.POSITIVE_INFINITY]], [["1"]], [[null]], [[undefined]], [[{}]]])(
      "%j is invalid",
      (list) => {
        expect(isValidSequentialList(list)).toBe(false);
      },
    );
  });

  describe("rejects non-arrays", () => {
    it.each([["nope"], [null], [undefined], [42], [{ length: 2 }]])("%j is invalid", (value) => {
      expect(isValidSequentialList(value)).toBe(false);
    });
  });

  describe("agrees with an independently constructed oracle", () => {
    // The oracle verifies "exactly one absent" directly; the implementation
    // infers it from pigeonhole. Agreement is evidence the inference holds.
    it("on every array of length 0-4 over the values 0..5", () => {
      const alphabet = [0, 1, 2, 3, 4, 5];
      const mismatches: unknown[] = [];
      let checked = 0;

      for (let length = 0; length <= 4; length++) {
        const total = alphabet.length ** length;
        for (let x = 0; x < total; x++) {
          const list: number[] = [];
          let y = x;
          for (let k = 0; k < length; k++) {
            list.push(alphabet[y % alphabet.length]);
            y = Math.floor(y / alphabet.length);
          }
          checked++;
          if (isValidSequentialList(list) !== oracle(list).valid) mismatches.push(list);
        }
      }

      expect(checked).toBeGreaterThan(1500);
      expect(mismatches).toEqual([]);
    });
  });

  describe("guards the algorithm it is paired with", () => {
    it("every list it accepts yields the correct answer", () => {
      const offenders = everyValidList(6).filter(
        ({ list, missing }) => !isValidSequentialList(list) || jsFind(list) !== missing,
      );
      expect(offenders).toEqual([]);
    });

    it("the documented nonsense cases are all rejected", () => {
      for (const list of [
        [1, 1, 2],
        [1, 3, 5],
        [0, 1, 2],
      ]) {
        expect(isValidSequentialList(list)).toBe(false);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Mirrors
// ---------------------------------------------------------------------------

describe("the JavaScript and TypeScript mirrors stay in lockstep", () => {
  const cases = everyValidList(6);

  it("findMissingSequentialNumber produces identical output", () => {
    const mismatches = cases.filter(({ list }) => tsFind(list) !== jsFind(list));
    expect(mismatches).toEqual([]);
  });

  it("isValidSequentialList produces identical output", () => {
    const inputs: unknown[] = [
      ...cases.map((c) => c.list),
      [1, 1],
      [0],
      [3],
      [1.5],
      "nope",
      null,
      undefined,
      42,
    ];
    const mismatches = inputs.filter((input) => tsIsValid(input) !== jsIsValid(input));
    expect(mismatches).toEqual([]);
  });
});
