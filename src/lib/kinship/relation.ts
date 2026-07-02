import {
  type FamilyGraph,
  type Gender,
  type BloodRelation,
  bloodRelation,
} from "./graph";
import { bloodLabel, spouseWord } from "./labels";

export interface Relation {
  /** "A is B's ___" */
  labelAB: string;
  /** "B is A's ___" */
  labelBA: string;
  /** Accepted phrasings per direction (gendered + neutral), for cheap matching. */
  acceptedAB: string[];
  acceptedBA: string[];
  /** Kinship distance: generational steps + spouse hops. Drives difficulty. */
  distance: number;
}

function mirror(rel: BloodRelation): BloodRelation {
  return { up: rel.down, down: rel.up, fullSiblings: rel.fullSiblings };
}

function pick(gender: Gender, female: string, male: string, neutral: string) {
  if (gender === "female") return female;
  if (gender === "male") return male;
  return neutral;
}

function greats(count: number): string {
  return "great-".repeat(Math.max(0, count));
}

/**
 * Label for someone who is the SPOUSE of the target's blood relative.
 * `rel` = blood relation of the spouse-partner toward the target
 * ("partner is target's rel"), `personGender` = the person being labeled,
 * `partnerGender` = the blood relative they are married to.
 */
function spouseOfBloodLabel(
  rel: BloodRelation,
  personGender: Gender,
  partnerGender: Gender,
): string {
  const { up, down } = rel;
  if (up === 0 && down === 1)
    return pick(personGender, "stepmother", "stepfather", "stepparent");
  if (up === 0 && down >= 2)
    return `step-${greats(down - 2)}${pick(personGender, "grandmother", "grandfather", "grandparent")}`;
  if (up === 1 && down === 0)
    return pick(personGender, "daughter-in-law", "son-in-law", "child-in-law");
  if (up >= 2 && down === 0)
    return `${greats(up - 2)}${pick(personGender, "granddaughter", "grandson", "grandchild")}-in-law`;
  if (up === 1 && down === 1)
    return pick(personGender, "sister-in-law", "brother-in-law", "sibling-in-law");
  if (up === 1 && down >= 2)
    return `${greats(down - 2)}${pick(personGender, "aunt", "uncle", "aunt or uncle")} by marriage`;
  return `${bloodLabel(rel, partnerGender)}'s ${spouseWord(personGender)}`;
}

/**
 * Label for someone who is a blood relative OF the target's spouse.
 * `rel` = blood relation of the person toward the spouse
 * ("person is spouse's rel").
 */
function bloodOfSpouseLabel(
  rel: BloodRelation,
  personGender: Gender,
  spouseGender: Gender,
): string {
  const { up, down } = rel;
  if (up === 0 && down === 1)
    return pick(personGender, "mother-in-law", "father-in-law", "parent-in-law");
  if (up === 0 && down >= 2)
    return `${greats(down - 2)}${pick(personGender, "grandmother", "grandfather", "grandparent")}-in-law`;
  if (up === 1 && down === 0)
    return pick(personGender, "stepdaughter", "stepson", "stepchild");
  if (up >= 2 && down === 0)
    return `step-${greats(up - 2)}${pick(personGender, "granddaughter", "grandson", "grandchild")}`;
  if (up === 1 && down === 1)
    return pick(personGender, "sister-in-law", "brother-in-law", "sibling-in-law");
  return `${spouseWord(spouseGender)}'s ${bloodLabel(rel, personGender)}`;
}

type AffinalCandidate = {
  side: "a" | "b";
  /** The spouse doing the hop (A's spouse for side "a", B's spouse for side "b"). */
  spouseId: string;
  rel: BloodRelation;
  distance: number;
};

/**
 * Full relationship between two people: blood first, then spouse, then a
 * single spouse hop on either endpoint. Returns null when unrelated (such a
 * pair is never used as a question).
 */
export function relation(
  graph: FamilyGraph,
  aId: string,
  bId: string,
  ancestorCache?: Map<string, Map<string, number>>,
): Relation | null {
  if (aId === bId) return null;
  const a = graph.people.get(aId);
  const b = graph.people.get(bId);
  if (!a || !b) return null;

  const genderedAndNeutral = (
    make: (gender: Gender) => string,
    gender: Gender,
  ): [string, string[]] => {
    const label = make(gender);
    const variants = new Set([label, make("other")]);
    return [label, [...variants]];
  };

  const blood = bloodRelation(graph, aId, bId, ancestorCache);
  if (blood) {
    const [labelAB, acceptedAB] = genderedAndNeutral(
      (g) => bloodLabel(blood, g),
      a.gender,
    );
    const [labelBA, acceptedBA] = genderedAndNeutral(
      (g) => bloodLabel(mirror(blood), g),
      b.gender,
    );
    return { labelAB, labelBA, acceptedAB, acceptedBA, distance: blood.up + blood.down };
  }

  if ((graph.spouses.get(aId) ?? []).includes(bId)) {
    const [labelAB, acceptedAB] = genderedAndNeutral(spouseWord, a.gender);
    const [labelBA, acceptedBA] = genderedAndNeutral(spouseWord, b.gender);
    return { labelAB, labelBA, acceptedAB, acceptedBA, distance: 1 };
  }

  const candidates: AffinalCandidate[] = [];
  for (const spouseId of graph.spouses.get(aId) ?? []) {
    const rel = bloodRelation(graph, spouseId, bId, ancestorCache);
    if (rel) {
      candidates.push({ side: "a", spouseId, rel, distance: rel.up + rel.down + 1 });
    }
  }
  for (const spouseId of graph.spouses.get(bId) ?? []) {
    const rel = bloodRelation(graph, aId, spouseId, ancestorCache);
    if (rel) {
      candidates.push({ side: "b", spouseId, rel, distance: rel.up + rel.down + 1 });
    }
  }
  if (candidates.length === 0) return null;

  candidates.sort((x, y) => x.distance - y.distance);
  const best = candidates[0];
  const spouse = graph.people.get(best.spouseId)!;

  if (best.side === "a") {
    // A's spouse is B's blood relative.
    const [labelAB, acceptedAB] = genderedAndNeutral(
      (g) => spouseOfBloodLabel(best.rel, g, spouse.gender),
      a.gender,
    );
    const [labelBA, acceptedBA] = genderedAndNeutral(
      (g) => bloodOfSpouseLabel(mirror(best.rel), g, spouse.gender),
      b.gender,
    );
    return { labelAB, labelBA, acceptedAB, acceptedBA, distance: best.distance };
  }
  // B's spouse is A's blood relative (A is the spouse's blood relative).
  const [labelAB, acceptedAB] = genderedAndNeutral(
    (g) => bloodOfSpouseLabel(best.rel, g, spouse.gender),
    a.gender,
  );
  const [labelBA, acceptedBA] = genderedAndNeutral(
    (g) => spouseOfBloodLabel(mirror(best.rel), g, spouse.gender),
    b.gender,
  );
  return { labelAB, labelBA, acceptedAB, acceptedBA, distance: best.distance };
}
