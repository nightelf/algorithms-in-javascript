const DEFAULT_ENCLOSING_PAIRS = '(){}[]';

type Lookups = {
  open: Map<string, string>;
  close: Map<string, string>;
};

/**
 * Validates an `enclosingPairs` string and turns it into the two lookups the
 * scan needs: opener → closer, and closer → opener.
 *
 * The string is spread into an array of code points first, so every length and
 * index below counts *characters* rather than UTF-16 code units. Without that,
 * astral delimiters like 🔒🔓 measure 4 units against 2 characters and get
 * rejected as duplicates, and indexing them yields half a surrogate pair.
 *
 * Throws if if the string is empty, odd-length, or repeats a character
 */
const buildLookups = (enclosingPairs: string): Lookups => {
  const chars = [...enclosingPairs];

  if (chars.length === 0) {
    throw new Error("Enclosing pairs required");
  }

  if (chars.length % 2 !== 0) {
    throw new Error("Must have both opening and closing character for each pair");
  }

  // Subsumes "the two characters of a pair differ", "no opener repeats", "no
  // closer repeats", and "no character is both an opener and a closer" — every
  // malformed case is some character appearing twice.
  if (new Set(chars).size !== chars.length) {
    throw new Error("Enclosing pair characters must all be distinct");
  }

  const open = new Map<string, string>();
  const close = new Map<string, string>();
  for (let i = 0; i < chars.length; i += 2) {
    open.set(chars[i], chars[i + 1]);
    close.set(chars[i + 1], chars[i]);
  }

  return { open, close };
};

// Built once at module load rather than on every call. Validating and building
// two Maps costs more than scanning a short string, so rebuilding per call is
// ~3x the total work when checking many small inputs.
const DEFAULT_LOOKUPS = buildLookups(DEFAULT_ENCLOSING_PAIRS);

/**
 * Returns whether every opening character in `testString` is closed by its
 * matching character, in the right order. Characters outside `enclosingPairs`
 * are ignored.
 *
 * Classic stack problem: push on an opener, and on a closer pop and check that
 * what came off is the opener that closer expects. A closer arriving when the
 * stack is empty pops `undefined`, which can never equal a real opener, so the
 * empty case needs no separate test. The final `stack.length === 0` is what
 * catches openers that were never closed — it belongs after the loop, since it
 * is a question about the end state rather than about any single character.
 *
 * Time:  O(n) — one pass, with O(1) work per character.
 * Space: O(n) worst case, for a string that is entirely openers.
 *
 * Throws if if `enclosingPairs` is empty, odd-length, or repeats a character
 */
export const hasValidEnclosingPairs = (
  testString: string,
  enclosingPairs: string = DEFAULT_ENCLOSING_PAIRS,
): boolean => {
  const { open, close } =
    enclosingPairs === DEFAULT_ENCLOSING_PAIRS ? DEFAULT_LOOKUPS : buildLookups(enclosingPairs);

  const stack = [];
  for (const char of testString) {
    if (open.has(char)) {
      stack.push(char);
    } else if (close.has(char)) {
      if (stack.pop() !== close.get(char)) return false;
    }
    // any other character is ignored
  }

  return stack.length === 0;
};
