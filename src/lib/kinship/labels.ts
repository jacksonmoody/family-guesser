import { type Gender, type BloodRelation } from "./graph";

function pick(gender: Gender, female: string, male: string, neutral: string) {
  if (gender === "female") return female;
  if (gender === "male") return male;
  return neutral;
}

const ORDINALS = [
  "zeroth",
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
];

export function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

function greats(count: number): string {
  return "great-".repeat(Math.max(0, count));
}

export function spouseWord(gender: Gender): string {
  return pick(gender, "wife", "husband", "spouse");
}

/**
 * Label for "A is B's ___" given a blood relation, gendered by A with a
 * neutral fallback. `up` = A's generations to the common ancestor,
 * `down` = B's.
 */
export function bloodLabel(rel: BloodRelation, aGender: Gender): string {
  const { up, down, fullSiblings } = rel;

  if (up === 0 && down === 0) return "self";
  if (up === 0) {
    if (down === 1) return pick(aGender, "mother", "father", "parent");
    return (
      greats(down - 2) + pick(aGender, "grandmother", "grandfather", "grandparent")
    );
  }
  if (down === 0) {
    if (up === 1) return pick(aGender, "daughter", "son", "child");
    return greats(up - 2) + pick(aGender, "granddaughter", "grandson", "grandchild");
  }
  if (up === 1 && down === 1) {
    const base = pick(aGender, "sister", "brother", "sibling");
    return fullSiblings ? base : `half-${base}`;
  }
  if (up === 1) {
    return greats(down - 2) + pick(aGender, "aunt", "uncle", "parent's sibling");
  }
  if (down === 1) {
    return greats(up - 2) + pick(aGender, "niece", "nephew", "sibling's child");
  }
  const degree = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  const removal =
    removed === 0
      ? ""
      : removed === 1
        ? " once removed"
        : removed === 2
          ? " twice removed"
          : ` ${removed} times removed`;
  return `${ordinal(degree)} cousin${removal}`;
}

/** Neutral-gender variant of the same relation, used for answer matching. */
export function neutralBloodLabel(rel: BloodRelation): string {
  return bloodLabel(rel, "other");
}
