const SYNONYMS: Record<string, string> = {
  mom: "mother",
  mommy: "mother",
  mama: "mother",
  momma: "mother",
  ma: "mother",
  dad: "father",
  daddy: "father",
  papa: "father",
  pa: "father",
  pops: "father",
  grandma: "grandmother",
  gma: "grandmother",
  granny: "grandmother",
  gran: "grandmother",
  nana: "grandmother",
  nan: "grandmother",
  grammy: "grandmother",
  gram: "grandmother",
  mimi: "grandmother",
  grandpa: "grandfather",
  gpa: "grandfather",
  gramps: "grandfather",
  grampa: "grandfather",
  grandad: "grandfather",
  granddad: "grandfather",
  papaw: "grandfather",
  poppop: "grandfather",
  grandkid: "grandchild",
  bro: "brother",
  sis: "sister",
  sibling: "sibling",
  aunty: "aunt",
  auntie: "aunt",
  hubby: "husband",
  hubs: "husband",
  kid: "child",
  kiddo: "child",
  "1st": "first",
  "2nd": "second",
  "3rd": "third",
  "4th": "fourth",
  "5th": "fifth",
  grandmas: "grandmother",
  cousins: "cousin",
  brothers: "brother",
  sisters: "sister",
};

const FILLER = new Set([
  "my",
  "his",
  "her",
  "their",
  "our",
  "the",
  "a",
  "an",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "being",
  "they",
  "she",
  "he",
  "them",
  "each",
  "other",
  "to",
  "that",
  "its",
  "it",
  "s",
  // apostrophe-stripped contractions ("she's" -> "shes")
  "shes",
  "hes",
  "theyre",
  "thats",
  "whos",
  "im",
  "youre",
]);

// Words that only refine the degree of a relationship. The game accepts
// "cousin" for "second cousin once removed", so a comparison with these
// stripped from both sides also counts as a match.
const DEGREE_QUALIFIERS = new Set([
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "once",
  "twice",
  "thrice",
  "removed",
  "times",
  "great",
  "half",
]);

function stripDegree(normalized: string): string {
  return normalized
    .split(" ")
    .filter((token) => !DEGREE_QUALIFIERS.has(token))
    .join(" ");
}

/**
 * Normalize free text about a relationship into a compact comparable form:
 * lowercase, hyphens folded to spaces, punctuation stripped, filler words and
 * the two people's names removed, colloquial synonyms canonicalized.
 */
export function normalizeAnswer(text: string, stripNames: string[] = []): string {
  const nameTokens = new Set(
    stripNames
      .flatMap((name) => name.toLowerCase().split(/\s+/))
      .filter(Boolean),
  );
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => SYNONYMS[token] ?? token)
    .filter(
      (token) =>
        !FILLER.has(token) &&
        !nameTokens.has(token) &&
        // possessive forms of names: "toms" for "Tom"
        !(token.endsWith("s") && nameTokens.has(token.slice(0, -1))),
    )
    .join(" ");
}

/**
 * Cheap verification pass. Returns how the answer matched, or null when the
 * LLM needs to take a look.
 */
export function cheapMatch(
  answer: string,
  acceptedLabels: string[],
  personNames: string[],
): "exact" | "synonym" | null {
  const rawNormalized = normalizeAnswer(answer);
  const namelessNormalized = normalizeAnswer(answer, personNames);
  for (const label of acceptedLabels) {
    const target = normalizeAnswer(label);
    if (!target) continue;
    const hit =
      rawNormalized === target ||
      namelessNormalized === target ||
      // degree-insensitive: "cousins" matches "first cousin once removed"
      (stripDegree(namelessNormalized) === stripDegree(target) &&
        stripDegree(target).length > 0);
    if (hit) {
      // "exact" when the raw lowercased text already matches the label;
      // "synonym" when normalization/synonyms did the work.
      const plain = answer.toLowerCase().replace(/\s+/g, " ").trim();
      return plain === label.toLowerCase() ? "exact" : "synonym";
    }
  }
  return null;
}
