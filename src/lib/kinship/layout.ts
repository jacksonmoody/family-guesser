import { type FamilyGraph, type Person } from "./graph";

// Canvas geometry (px). AVATAR_CENTER_Y must match the card markup in
// TreeCanvas: a size-"md" (48px) avatar sits flush at the card's top edge.
export const NODE_W = 88;
export const NODE_H = 96;
export const AVATAR_CENTER_Y = 24;
export const SPOUSE_GAP = 28;
export const SIBLING_GAP = 20;
export const SUBTREE_GAP = 36;
export const ROW_H = 176;
export const PAD = 16;

export interface PlacedPerson {
  person: Person;
  x: number; // card top-left
  y: number;
}

/** Horizontal marriage line between two adjacent cards. */
export interface SpouseEdge {
  x1: number;
  x2: number;
  y: number;
}

/** Drop from a couple (or single parent) to the sibling bar, then to each child. */
export interface FamilyDrop {
  midX: number;
  parentY: number;
  busY: number;
  childXs: number[];
  childY: number;
}

export interface TreeLayout {
  nodes: PlacedPerson[];
  spouseEdges: SpouseEdge[];
  drops: FamilyDrop[];
  width: number;
  height: number;
}

interface TreeNode {
  person: Person;
  spouses: Person[];
  children: TreeNode[];
}

/** Depth-first assembly of the couple tree; `visited` prevents duplicates. */
function buildNode(
  graph: FamilyGraph,
  person: Person,
  visited: Set<string>,
): TreeNode | null {
  if (visited.has(person.id)) return null;
  visited.add(person.id);

  const spouses = (graph.spouses.get(person.id) ?? [])
    .map((id) => graph.people.get(id))
    .filter((p): p is Person => Boolean(p) && !visited.has((p as Person).id));
  for (const spouse of spouses) visited.add(spouse.id);

  const childIds = new Set<string>(graph.children.get(person.id) ?? []);
  for (const spouse of spouses) {
    for (const childId of graph.children.get(spouse.id) ?? []) {
      childIds.add(childId);
    }
  }
  const children = [...childIds]
    .map((id) => graph.people.get(id))
    .filter((p): p is Person => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => buildNode(graph, child, visited))
    .filter((node): node is TreeNode => node !== null);

  return { person, spouses, children };
}

function unitWidth(node: TreeNode): number {
  const members = 1 + node.spouses.length;
  return members * NODE_W + node.spouses.length * SPOUSE_GAP;
}

function subtreeWidth(node: TreeNode, memo: Map<string, number>): number {
  const cached = memo.get(node.person.id);
  if (cached !== undefined) return cached;
  const childrenWidth =
    node.children.reduce((sum, c) => sum + subtreeWidth(c, memo), 0) +
    Math.max(0, node.children.length - 1) * SIBLING_GAP;
  const width = Math.max(unitWidth(node), childrenWidth);
  memo.set(node.person.id, width);
  return width;
}

export function layoutTree(graph: FamilyGraph): {
  layout: TreeLayout;
  orphans: Person[];
} {
  const hasParents = (id: string) => (graph.parents.get(id) ?? []).length > 0;
  // Roots: parentless people who aren't just married into a deeper branch.
  const roots = [...graph.people.values()]
    .filter(
      (p) =>
        !hasParents(p.id) &&
        (graph.spouses.get(p.id) ?? []).every((s) => !hasParents(s)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const visited = new Set<string>();
  const trees = roots
    .map((root) => buildNode(graph, root, visited))
    .filter((node): node is TreeNode => node !== null);

  // Anyone unreachable from a root (data-entry gaps) still deserves a spot.
  const orphans = [...graph.people.values()]
    .filter((p) => !visited.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const memo = new Map<string, number>();
  const nodes: PlacedPerson[] = [];
  const spouseEdges: SpouseEdge[] = [];
  const drops: FamilyDrop[] = [];
  let maxDepth = 0;

  // Places `node`'s subtree in the slice starting at `x0`; returns the
  // person's own card center x (where a parent drop attaches).
  function place(node: TreeNode, x0: number, depth: number): number {
    maxDepth = Math.max(maxDepth, depth);
    const y = PAD + depth * ROW_H;
    const sliceWidth = subtreeWidth(node, memo);

    // Couple unit and children block are both centered in the same slice,
    // so children land under the couple's midpoint.
    const unitLeft = x0 + (sliceWidth - unitWidth(node)) / 2;
    const members = [node.person, ...node.spouses];
    const memberXs = members.map((_, i) => unitLeft + i * (NODE_W + SPOUSE_GAP));
    members.forEach((person, i) => nodes.push({ person, x: memberXs[i], y }));

    const marriageY = y + AVATAR_CENTER_Y;
    for (let i = 0; i < members.length - 1; i++) {
      spouseEdges.push({
        x1: memberXs[i] + NODE_W / 2,
        x2: memberXs[i + 1] + NODE_W / 2,
        y: marriageY,
      });
    }

    if (node.children.length > 0) {
      const childrenWidth =
        node.children.reduce((sum, c) => sum + subtreeWidth(c, memo), 0) +
        (node.children.length - 1) * SIBLING_GAP;
      let cursor = x0 + (sliceWidth - childrenWidth) / 2;
      const childY = PAD + (depth + 1) * ROW_H;
      const childXs = node.children.map((child) => {
        const childX = place(child, cursor, depth + 1);
        cursor += subtreeWidth(child, memo) + SIBLING_GAP;
        return childX;
      });

      // Simplification: with 2+ spouses, children of every marriage share
      // the single drop between the person and their first spouse.
      const midX =
        node.spouses.length > 0
          ? (memberXs[0] + memberXs[1]) / 2 + NODE_W / 2
          : memberXs[0] + NODE_W / 2;
      drops.push({
        midX,
        parentY: node.spouses.length > 0 ? marriageY : y + NODE_H,
        busY: childY - 24,
        childXs,
        childY,
      });
    }

    return memberXs[0] + NODE_W / 2;
  }

  let cursor = PAD;
  for (const tree of trees) {
    place(tree, cursor, 0);
    cursor += subtreeWidth(tree, memo) + SUBTREE_GAP;
  }

  const width = trees.length > 0 ? cursor - SUBTREE_GAP + PAD : 2 * PAD;
  const height = PAD + maxDepth * ROW_H + NODE_H + PAD;

  return { layout: { nodes, spouseEdges, drops, width, height }, orphans };
}
