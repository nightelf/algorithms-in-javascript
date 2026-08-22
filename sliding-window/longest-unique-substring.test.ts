import { describe, it, expect } from "vitest";

import { longestUniqueSubstringLength as jsImplementation } from "./longest-unique-substring.js";
import { longestUniqueSubstringLength as tsImplementation } from "./longest-unique-substring.ts";

type Implementation = (searchString: string) => number;

/**
 * O(n^2) oracle. Obviously correct, far too slow for real input — its only job
 * is to tell us what the sliding window should have produced.
 */
const bruteForce: Implementation = (searchString) => {
  let longest = 0;

  for (let start = 0; start < searchString.length; start++) {
    const seen = new Set<string>();

    for (let end = start; end < searchString.length; end++) {
      if (seen.has(searchString[end])) break;
      seen.add(searchString[end]);
      longest = Math.max(longest, end - start + 1);
    }
  }

  return longest;
};

/** Seeded PRNG (mulberry32) so a fuzz failure always reproduces. */
const createRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const implementations: ReadonlyArray<[string, Implementation]> = [
  ["JavaScript", jsImplementation],
  ["TypeScript", tsImplementation],
];

describe.each(implementations)("longestUniqueSubstringLength (%s)", (_name, longestUniqueSubstringLength) => {
  describe("problem statement examples", () => {
    it.each([
      ["abcabcbb", 3],
      ["bbbbb", 1],
      ["pwwkew", 3],
    ])("%j → %i", (input, expected) => {
      expect(longestUniqueSubstringLength(input)).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("returns 0 for the empty string", () => {
      expect(longestUniqueSubstringLength("")).toBe(0);
    });

    it("returns 1 for a single character", () => {
      expect(longestUniqueSubstringLength("a")).toBe(1);
    });

    it("returns the full length when every character is unique", () => {
      expect(longestUniqueSubstringLength("abcdefg")).toBe(7);
    });

    it("returns 1 when every character is identical", () => {
      expect(longestUniqueSubstringLength("cccccccc")).toBe(1);
    });
  });

  describe("regression: the left pointer must never move backwards", () => {
    // These are the cases that a naive `left = previousIndex + 1` (no
    // Math.max) gets wrong, because it reuses an index that has already
    // fallen outside the window.
    it.each([
      ["abba", 2],
      ["tmmzuxt", 5],
      ["abcdb a", 5],
      ["dvdf", 3],
      ["abac", 3],
    ])("%j → %i", (input, expected) => {
      expect(longestUniqueSubstringLength(input)).toBe(expected);
    });
  });

  describe("full character set", () => {
    it("handles digits, symbols and spaces", () => {
      expect(longestUniqueSubstringLength("a 1!b 2")).toBe(5); // "1!b 2"
    });

    it("treats a space like any other character", () => {
      expect(longestUniqueSubstringLength("   ")).toBe(1);
    });
  });

  describe("agrees with a brute-force oracle", () => {
    it("on 5000 seeded random strings over a repeat-heavy alphabet", () => {
      const random = createRandom(20260822);
      const alphabet = "abcd 1!";
      const mismatches: Array<{ input: string; actual: number; expected: number }> = [];

      for (let trial = 0; trial < 5000; trial++) {
        const length = 1 + Math.floor(random() * 14);
        let input = "";
        for (let k = 0; k < length; k++) {
          input += alphabet[Math.floor(random() * alphabet.length)];
        }

        const actual = longestUniqueSubstringLength(input);
        const expected = bruteForce(input);
        if (actual !== expected) mismatches.push({ input, actual, expected });
      }

      expect(mismatches).toEqual([]);
    });
  });

  describe("scales to the stated constraint of 5 * 10^4 characters", () => {
    it("stays linear on a 50000-character input", () => {
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      let input = "";
      for (let i = 0; i < 50_000; i++) input += alphabet[i % alphabet.length];

      expect(longestUniqueSubstringLength(input)).toBe(26);
    });
  });
});

describe("the two implementations stay in lockstep", () => {
  it("produces identical output on 2000 seeded random strings", () => {
    const random = createRandom(7);
    const alphabet = "abc xy9";

    for (let trial = 0; trial < 2000; trial++) {
      const length = Math.floor(random() * 20);
      let input = "";
      for (let k = 0; k < length; k++) {
        input += alphabet[Math.floor(random() * alphabet.length)];
      }

      expect(tsImplementation(input)).toBe(jsImplementation(input));
    }
  });
});
