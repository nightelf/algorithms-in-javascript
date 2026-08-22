import { describe, it, expect } from "vitest";

import {
  longestUniqueSubstringLength as jsLength,
  longestUniqueSubstring as jsSubstring,
} from "./longest-unique-substring.js";
import {
  longestUniqueSubstringLength as tsLength,
  longestUniqueSubstring as tsSubstring,
} from "./longest-unique-substring.ts";

type LengthImplementation = (searchString: string) => number;
type SubstringImplementation = (searchString: string) => string;

/**
 * O(n^2) oracles. Obviously correct, far too slow for real input — their only
 * job is to say what the sliding window should have produced. Both scan `start`
 * ascending and improve only on a strict `>`, so the leftmost winner survives.
 */
const bruteForceLength: LengthImplementation = (searchString) => {
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

const bruteForceSubstring: SubstringImplementation = (searchString) => {
  let longest = "";

  for (let start = 0; start < searchString.length; start++) {
    const seen = new Set<string>();

    for (let end = start; end < searchString.length; end++) {
      if (seen.has(searchString[end])) break;
      seen.add(searchString[end]);
      if (end - start + 1 > longest.length) {
        longest = searchString.substring(start, end + 1);
      }
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

const randomStrings = (seed: number, alphabet: string, count: number, maxLength: number) => {
  const random = createRandom(seed);
  const inputs: string[] = [];

  for (let trial = 0; trial < count; trial++) {
    const length = Math.floor(random() * (maxLength + 1));
    let input = "";
    for (let k = 0; k < length; k++) {
      input += alphabet[Math.floor(random() * alphabet.length)];
    }
    inputs.push(input);
  }

  return inputs;
};

const hasNoRepeats = (value: string) => new Set(value).size === value.length;

// ---------------------------------------------------------------------------
// longestUniqueSubstringLength — returns the length
// ---------------------------------------------------------------------------

const lengthImplementations: ReadonlyArray<[string, LengthImplementation]> = [
  ["JavaScript", jsLength],
  ["TypeScript", tsLength],
];

// These exercise the shared window through the length surface. Since the
// length function now delegates to longestUniqueSubstring, they cover the same
// loop as the block below — but they pin the length contract independently of
// how it happens to be implemented.
describe.each(lengthImplementations)("longestUniqueSubstringLength (%s)", (_name, longestUniqueSubstringLength) => {
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
      expect(longestUniqueSubstringLength("a 1!b 2")).toBe(5); // "a 1!b" and "1!b 2" both qualify
    });

    it("treats a space like any other character", () => {
      expect(longestUniqueSubstringLength("   ")).toBe(1);
    });
  });

  describe("agrees with a brute-force oracle", () => {
    it("on 5000 seeded random strings over a repeat-heavy alphabet", () => {
      const mismatches = randomStrings(20260822, "abcd 1!", 5000, 14)
        .map((input) => ({ input, actual: longestUniqueSubstringLength(input), expected: bruteForceLength(input) }))
        .filter(({ actual, expected }) => actual !== expected);

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

// ---------------------------------------------------------------------------
// longestUniqueSubstring — returns the substring itself
// ---------------------------------------------------------------------------

const substringImplementations: ReadonlyArray<[string, SubstringImplementation]> = [
  ["JavaScript", jsSubstring],
  ["TypeScript", tsSubstring],
];

describe.each(substringImplementations)("longestUniqueSubstring (%s)", (_name, longestUniqueSubstring) => {
  describe("problem statement examples", () => {
    it.each([
      ["abcabcbb", "abc"],
      ["bbbbb", "b"],
      ["pwwkew", "wke"],
    ])("%j → %j", (input, expected) => {
      expect(longestUniqueSubstring(input)).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("returns the empty string for empty input", () => {
      expect(longestUniqueSubstring("")).toBe("");
    });

    it("returns the character itself for a single character", () => {
      expect(longestUniqueSubstring("a")).toBe("a");
    });

    it("returns the whole input when every character is unique", () => {
      expect(longestUniqueSubstring("abcdefg")).toBe("abcdefg");
    });

    it("returns one character when every character is identical", () => {
      expect(longestUniqueSubstring("cccccccc")).toBe("c");
    });
  });

  describe("regression: uninitialised accumulators", () => {
    // `let left, right, leftLongest, rightLongest = 0` initialises only the
    // last name; the rest are undefined, and a missing `longest` declaration
    // threw a ReferenceError on the first iteration. Any non-empty input
    // catches it — empty input passed even while the function was broken.
    it("returns a real substring rather than throwing", () => {
      expect(() => longestUniqueSubstring("ab")).not.toThrow();
      expect(longestUniqueSubstring("ab")).toBe("ab");
    });

    it("does not return undefined-derived garbage", () => {
      const result = longestUniqueSubstring("abcabcbb");
      expect(result).not.toContain("undefined");
      expect(result).not.toBe("");
    });
  });

  describe("regression: the left pointer must never move backwards", () => {
    it.each([
      ["abba", "ab"],
      ["tmmzuxt", "mzuxt"],
      ["abcdb a", "cdb a"],
      ["dvdf", "vdf"],
      ["abac", "bac"],
    ])("%j → %j", (input, expected) => {
      expect(longestUniqueSubstring(input)).toBe(expected);
    });
  });

  describe("ties are broken leftmost", () => {
    // Each of these gives a different answer under `<=` instead of `<`, so the
    // block actually pins the tie-break rather than just passing either way.
    // ("abcabc" and "abab" are tempting here but agree under both operators.)
    it.each([
      ["aba", "ab"], // "ba" also has length 2
      ["bab", "ba"], // "ab" also has length 2
      ["cbc", "cb"], // "bc" also has length 2
      ["a 1!b 2", "a 1!b"], // "1!b 2" also has length 5
    ])("%j → %j", (input, expected) => {
      expect(longestUniqueSubstring(input)).toBe(expected);
    });
  });

  describe("full character set", () => {
    it("handles digits, symbols and spaces", () => {
      expect(longestUniqueSubstring("a 1!b 2")).toBe("a 1!b"); // ties with "1!b 2"; leftmost wins
    });

    it("treats a space like any other character", () => {
      expect(longestUniqueSubstring("   ")).toBe(" ");
    });
  });

  describe("structural properties hold for every input", () => {
    const inputs = randomStrings(31337, "abcd 1!", 2000, 16);

    it("the result is always free of repeated characters", () => {
      const offenders = inputs.filter((input) => !hasNoRepeats(longestUniqueSubstring(input)));
      expect(offenders).toEqual([]);
    });

    it("the result is always a contiguous substring of the input", () => {
      const offenders = inputs.filter((input) => !input.includes(longestUniqueSubstring(input)));
      expect(offenders).toEqual([]);
    });

    // Structurally true while longestUniqueSubstringLength delegates to
    // longestUniqueSubstring. Kept as a guard: if the two are ever split back
    // into independent implementations, this is what catches them diverging.
    it("the result's length always equals longestUniqueSubstringLength", () => {
      const offenders = inputs.filter((input) => longestUniqueSubstring(input).length !== jsLength(input));
      expect(offenders).toEqual([]);
    });
  });

  describe("agrees with a brute-force oracle", () => {
    it("on 5000 seeded random strings over a repeat-heavy alphabet", () => {
      const mismatches = randomStrings(20260822, "abcd 1!", 5000, 14)
        .map((input) => ({ input, actual: longestUniqueSubstring(input), expected: bruteForceSubstring(input) }))
        .filter(({ actual, expected }) => actual !== expected);

      expect(mismatches).toEqual([]);
    });
  });

  describe("scales to the stated constraint of 5 * 10^4 characters", () => {
    it("stays linear on a 50000-character input", () => {
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      let input = "";
      for (let i = 0; i < 50_000; i++) input += alphabet[i % alphabet.length];

      expect(longestUniqueSubstring(input)).toBe(alphabet);
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-checks
// ---------------------------------------------------------------------------

describe("the JavaScript and TypeScript mirrors stay in lockstep", () => {
  const inputs = randomStrings(7, "abc xy9", 2000, 20);

  it("longestUniqueSubstringLength produces identical output", () => {
    const mismatches = inputs.filter((input) => tsLength(input) !== jsLength(input));
    expect(mismatches).toEqual([]);
  });

  it("longestUniqueSubstring produces identical output", () => {
    const mismatches = inputs.filter((input) => tsSubstring(input) !== jsSubstring(input));
    expect(mismatches).toEqual([]);
  });
});

describe("the two functions describe the same window", () => {
  // longestUniqueSubstringLength is currently `longestUniqueSubstring(s).length`,
  // so this holds by construction rather than by coincidence. It stays as a
  // regression guard against the two being re-split into separate loops.
  it("longestUniqueSubstring(s).length === longestUniqueSubstringLength(s)", () => {
    const inputs = randomStrings(99, "abcde!", 2000, 18);
    const mismatches = inputs.filter((input) => tsSubstring(input).length !== tsLength(input));
    expect(mismatches).toEqual([]);
  });
});
