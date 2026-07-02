export type Gender = "female" | "male" | "other";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  attending: boolean;
  photoPath: string | null;
}

export interface ParentLink {
  parentId: string;
  childId: string;
}

export interface SpouseLink {
  person1Id: string;
  person2Id: string;
}

export interface FamilyGraph {
  people: Map<string, Person>;
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  spouses: Map<string, string[]>;
}

export function buildGraph(
  people: Person[],
  parentLinks: ParentLink[],
  spouseLinks: SpouseLink[],
): FamilyGraph {
  const graph: FamilyGraph = {
    people: new Map(people.map((p) => [p.id, p])),
    parents: new Map(),
    children: new Map(),
    spouses: new Map(),
  };
  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const link of parentLinks) {
    if (!graph.people.has(link.parentId) || !graph.people.has(link.childId)) continue;
    push(graph.parents, link.childId, link.parentId);
    push(graph.children, link.parentId, link.childId);
  }
  for (const link of spouseLinks) {
    if (!graph.people.has(link.person1Id) || !graph.people.has(link.person2Id)) continue;
    push(graph.spouses, link.person1Id, link.person2Id);
    push(graph.spouses, link.person2Id, link.person1Id);
  }
  return graph;
}

/**
 * BFS upward through parents. Returns each ancestor's minimum generation
 * distance from the starting person, including the person themselves at 0.
 */
export function ancestorDepths(
  graph: FamilyGraph,
  personId: string,
): Map<string, number> {
  const depths = new Map<string, number>([[personId, 0]]);
  let frontier = [personId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const depth = depths.get(id)!;
      for (const parentId of graph.parents.get(id) ?? []) {
        if (!depths.has(parentId)) {
          depths.set(parentId, depth + 1);
          next.push(parentId);
        }
      }
    }
    frontier = next;
  }
  return depths;
}

export interface BloodRelation {
  /** Generations from person A up to the closest common ancestor. */
  up: number;
  /** Generations from person B up to the closest common ancestor. */
  down: number;
  /** For siblings (1,1): whether both parents are shared. */
  fullSiblings: boolean;
}

export function bloodRelation(
  graph: FamilyGraph,
  aId: string,
  bId: string,
  ancestorCache?: Map<string, Map<string, number>>,
): BloodRelation | null {
  const getDepths = (id: string) => {
    if (!ancestorCache) return ancestorDepths(graph, id);
    let cached = ancestorCache.get(id);
    if (!cached) {
      cached = ancestorDepths(graph, id);
      ancestorCache.set(id, cached);
    }
    return cached;
  };
  const ancA = getDepths(aId);
  const ancB = getDepths(bId);
  let best: { up: number; down: number } | null = null;
  const [smaller, larger] = ancA.size <= ancB.size ? [ancA, ancB] : [ancB, ancA];
  for (const [id, depth] of smaller) {
    const other = larger.get(id);
    if (other === undefined) continue;
    const up = smaller === ancA ? depth : other;
    const down = smaller === ancA ? other : depth;
    if (!best || up + down < best.up + best.down) best = { up, down };
  }
  if (!best) return null;

  let fullSiblings = false;
  if (best.up === 1 && best.down === 1) {
    const parentsA = graph.parents.get(aId) ?? [];
    const parentsB = new Set(graph.parents.get(bId) ?? []);
    const shared = parentsA.filter((p) => parentsB.has(p));
    fullSiblings = shared.length >= 2;
  }
  return { ...best, fullSiblings };
}
