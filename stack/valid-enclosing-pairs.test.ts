import { describe, it, expect } from "vitest";

import { hasValidEnclosingPairs as jsHasValidEnclosingPairs } from "./valid-enclosing-pairs.js";
import { hasValidEnclosingPairs as tsHasValidEnclosingPairs } from "./valid-enclosing-pairs.ts";

type Implementation = (testString: string, enclosingPairs?: string) => boolean;

/**
 * Reference implementation. Same idea, written as plainly as possible — its
 * only job is to say what the function under test should have produced.
 */
const reference: Implementation = (testString, enclosingPairs = "(){}[]") => {
  const chars = [...enclosingPairs];
  const open = new Map<string, string>();
  const close = new Map<string, string>();
  for (let i = 0; i < chars.length; i += 2) {
    open.set(chars[i], chars[i + 1]);
    close.set(chars[i + 1], chars[i]);
  }

  const stack: string[] = [];
  for (const char of testString) {
    if (open.has(char)) stack.push(char);
    else if (close.has(char) && stack.pop() !== close.get(char)) return false;
  }
  return stack.length === 0;
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
  const strings: string[] = [];
  for (let trial = 0; trial < count; trial++) {
    const length = Math.floor(random() * (maxLength + 1));
    let value = "";
    for (let k = 0; k < length; k++) value += alphabet[Math.floor(random() * alphabet.length)];
    strings.push(value);
  }
  return strings;
};

const implementations: ReadonlyArray<[string, Implementation]> = [
  ["JavaScript", jsHasValidEnclosingPairs],
  ["TypeScript", tsHasValidEnclosingPairs],
];

describe.each(implementations)("hasValidEnclosingPairs (%s)", (_name, hasValidEnclosingPairs) => {
  describe("balanced strings", () => {
    it.each([[""], ["()"], ["[]"], ["{}"], ["()[]{}"], ["([{}])"], ["[({})]"], ["(())"], ["{[()]}"]])(
      "%j is valid",
      (input) => {
        expect(hasValidEnclosingPairs(input)).toBe(true);
      },
    );
  });

  describe("mismatched closers", () => {
    it.each([["(]"], ["([)]"], ["{)"], ["[}"], ["([}])"]])("%j is invalid", (input) => {
      expect(hasValidEnclosingPairs(input)).toBe(false);
    });
  });

  describe("regression: unclosed openers must fail", () => {
    // The original code put `return stack.length === 0` INSIDE the loop, where
    // every branch had already continued or returned. It was unreachable, the
    // function fell off the end returning undefined, and unclosed openers were
    // never caught. These are the cases that pin the return's placement.
    it.each([["("], ["(("], ["((("], ["(()"], ["([{}]"], ["{[()]"]])("%j is invalid", (input) => {
      expect(hasValidEnclosingPairs(input)).toBe(false);
    });

    it("returns an actual boolean, never undefined", () => {
      expect(hasValidEnclosingPairs("()")).toBe(true);
      expect(typeof hasValidEnclosingPairs("()")).toBe("boolean");
      expect(typeof hasValidEnclosingPairs("(")).toBe("boolean");
    });
  });

  describe("closers with nothing open", () => {
    // stack.pop() on an empty stack yields undefined, which can never equal a
    // real opener — so no explicit empty-stack check is needed.
    it.each([[")"], ["))"], [")("], ["()) "], ["}{"]])("%j is invalid", (input) => {
      expect(hasValidEnclosingPairs(input)).toBe(false);
    });
  });

  describe("characters outside the pair set are ignored", () => {
    it.each([
      ["a(b)c", true],
      ["hello world", true],
      ["fn(x) { return [1, 2]; }", true],
      ["fn(x) { return [1, 2; }", false],
      ["12345", true],
    ])("%j → %j", (input, expected) => {
      expect(hasValidEnclosingPairs(input)).toBe(expected);
    });
  });

  describe("custom enclosing pairs", () => {
    it.each([
      ["<a>", "<>", true],
      ["<a", "<>", false],
      ["<(a)>", "<>()", true],
      ["<(a>)", "<>()", false],
      ["«hi»", "«»", true],
      ["「hi」", "「」", true],
    ])("%j with pairs %j → %j", (input, pairs, expected) => {
      expect(hasValidEnclosingPairs(input, pairs)).toBe(expected);
    });

    it("ignores the default delimiters when custom pairs are supplied", () => {
      expect(hasValidEnclosingPairs("(((", "<>")).toBe(true);
      expect(hasValidEnclosingPairs("<(", "<>")).toBe(false);
    });
  });

  describe("astral delimiters are handled by code point", () => {
    // `.length` counts UTF-16 code units and `Set` iterates code points, so
    // without spreading enclosingPairs first, 🔒🔓 measures 4 against 2 and is
    // rejected as a duplicate — and indexing it yields half a surrogate pair.
    it.each([
      ["🔒a🔓", "🔒🔓", true],
      ["🔒a", "🔒🔓", false],
      ["🔓🔒", "🔒🔓", false],
      ["🔒🔒a🔓🔓", "🔒🔓", true],
    ])("%j with pairs %j → %j", (input, pairs, expected) => {
      expect(hasValidEnclosingPairs(input, pairs)).toBe(expected);
    });

    it("does not reject valid astral pairs as duplicates", () => {
      expect(() => hasValidEnclosingPairs("", "🔒🔓")).not.toThrow();
    });
  });

  describe("rejects malformed enclosingPairs", () => {
    it("throws when empty", () => {
      expect(() => hasValidEnclosingPairs("()", "")).toThrow("Enclosing pairs required");
    });

    it("throws when odd-length", () => {
      expect(() => hasValidEnclosingPairs("()", "(){}[")).toThrow(
        "Must have both opening and closing character for each pair",
      );
    });

    describe("throws when a character repeats", () => {
      // One check covers four distinct malformations.
      it.each([
        ['""', "same character on both sides of a pair"],
        ["()((", "an opener used in two pairs"],
        ["()){", "a character that is both a closer and an opener"],
        ["()[)", "a closer used in two pairs"],
      ])("%j — %s", (pairs) => {
        expect(() => hasValidEnclosingPairs("()", pairs)).toThrow(
          "Enclosing pair characters must all be distinct",
        );
      });
    });

    it("throws rather than returning false, so bad delimiters are not mistaken for an unbalanced string", () => {
      expect(() => hasValidEnclosingPairs("", "()((")).toThrow();
    });
  });

  describe("agrees with a reference implementation", () => {
    it("on 5000 seeded random strings over the default delimiters", () => {
      const mismatches = randomStrings(20260825, "()[]{}ab", 5000, 14).filter(
        (input) => hasValidEnclosingPairs(input) !== reference(input),
      );
      expect(mismatches).toEqual([]);
    });

    it("on 5000 seeded random strings over custom delimiters", () => {
      const mismatches = randomStrings(4242, "<>()ab", 5000, 12).filter(
        (input) => hasValidEnclosingPairs(input, "<>()") !== reference(input, "<>()"),
      );
      expect(mismatches).toEqual([]);
    });
  });

  describe("scales", () => {
    it("handles 100000 nested pairs", () => {
      const input = "(".repeat(50_000) + ")".repeat(50_000);
      expect(hasValidEnclosingPairs(input)).toBe(true);
    });

    it("rejects 50000 unclosed openers", () => {
      expect(hasValidEnclosingPairs("(".repeat(50_000))).toBe(false);
    });
  });
});

describe("the JavaScript and TypeScript mirrors stay in lockstep", () => {
  it("produce identical output on 5000 seeded random strings", () => {
    const mismatches = randomStrings(7, "()[]{}<>ab", 5000, 16).filter(
      (input) => tsHasValidEnclosingPairs(input) !== jsHasValidEnclosingPairs(input),
    );
    expect(mismatches).toEqual([]);
  });
});
