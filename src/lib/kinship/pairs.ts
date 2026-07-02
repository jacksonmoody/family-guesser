import { type FamilyGraph } from "./graph";
import { relation, type Relation } from "./relation";

export type Tier = "easy" | "medium" | "hard";

export interface CandidatePair {
  aId: string;
  bId: string;
  relation: Relation;
}

/** Order-independent key for "has this team seen this pair already?" checks. */
export function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

/**
 * All related pairs eligible for questions. Normal mode restricts both people
 * to reunion attendees; hard mode uses the whole tree. Team members are
 * always excluded, but relationships are computed over the full graph either
 * way (paths may pass through non-attendees).
 */
export function enumeratePairs(
  graph: FamilyGraph,
  options: { attendingOnly: boolean; excludeIds: string[] },
): CandidatePair[] {
  const excluded = new Set(options.excludeIds);
  const eligible = [...graph.people.values()].filter(
    (p) => !excluded.has(p.id) && (!options.attendingOnly || p.attending),
  );
  const cache = new Map<string, Map<string, number>>();
  const pairs: CandidatePair[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const rel = relation(graph, eligible[i].id, eligible[j].id, cache);
      if (rel) pairs.push({ aId: eligible[i].id, bId: eligible[j].id, relation: rel });
    }
  }
  return pairs;
}

/**
 * Adaptive difficulty buckets: split the actual distance distribution at the
 * 33rd/66th percentiles so tiers stay meaningful for shallow and deep trees
 * alike. Buckets can overlap at the boundary distances but are never empty
 * when any pairs exist.
 */
export function bucketize(
  pairs: CandidatePair[],
): Record<Tier, CandidatePair[]> {
  if (pairs.length === 0) return { easy: [], medium: [], hard: [] };
  const distances = pairs.map((p) => p.relation.distance).sort((a, b) => a - b);
  const at = (fraction: number) =>
    distances[Math.min(distances.length - 1, Math.floor(fraction * distances.length))];
  const p33 = at(1 / 3);
  const p66 = at(2 / 3);
  const buckets: Record<Tier, CandidatePair[]> = { easy: [], medium: [], hard: [] };
  for (const pair of pairs) {
    const d = pair.relation.distance;
    if (d <= p33) buckets.easy.push(pair);
    else if (d <= p66) buckets.medium.push(pair);
    else buckets.hard.push(pair);
  }
  // Degenerate distributions (few distinct distances) can starve a bucket;
  // backfill from the nearest non-empty one so every tier stays drawable.
  const order: Tier[] = ["easy", "medium", "hard"];
  for (const tier of order) {
    if (buckets[tier].length === 0) {
      const donor = order.find((t) => buckets[t].length > 0);
      if (donor) buckets[tier] = buckets[donor];
    }
  }
  return buckets;
}

export function randomTier(): Tier {
  const tiers: Tier[] = ["easy", "medium", "hard"];
  return tiers[Math.floor(Math.random() * tiers.length)];
}

/**
 * Draw a pair for a tier, skipping pairs the team has already been asked.
 * Falls back to adjacent tiers when a bucket is exhausted, then allows
 * repeats as a last resort so a long run never dead-ends.
 */
export function drawPair(
  buckets: Record<Tier, CandidatePair[]>,
  tier: Tier,
  askedKeys: Set<string>,
): { pair: CandidatePair; tier: Tier } | null {
  const fallbackOrder: Record<Tier, Tier[]> = {
    easy: ["easy", "medium", "hard"],
    medium: ["medium", "easy", "hard"],
    hard: ["hard", "medium", "easy"],
  };
  for (const candidateTier of fallbackOrder[tier]) {
    const fresh = buckets[candidateTier].filter(
      (p) => !askedKeys.has(pairKey(p.aId, p.bId)),
    );
    if (fresh.length > 0) {
      return {
        pair: fresh[Math.floor(Math.random() * fresh.length)],
        tier: candidateTier,
      };
    }
  }
  // Everything has been asked: allow repeats from the requested tier.
  const bucket = buckets[tier];
  if (bucket.length === 0) return null;
  return { pair: bucket[Math.floor(Math.random() * bucket.length)], tier };
}
