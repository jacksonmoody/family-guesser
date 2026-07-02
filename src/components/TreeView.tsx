import { type FamilyGraph, type Person } from "@/lib/kinship/graph";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

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

function PersonChip({ person }: { person: Person }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-100 py-1 pl-1 pr-3 shadow-sm">
      <Avatar name={person.name} photoPath={person.photoPath} size="sm" />
      <span className="text-sm font-medium">{person.name}</span>
      {person.attending && <Badge tone="sage">here!</Badge>}
    </span>
  );
}

function NodeItem({ node }: { node: TreeNode }) {
  return (
    <li className="relative">
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <PersonChip person={node.person} />
        {node.spouses.map((spouse) => (
          <span key={spouse.id} className="flex items-center gap-2">
            <span className="text-brown-300">♥</span>
            <PersonChip person={spouse} />
          </span>
        ))}
      </div>
      {node.children.length > 0 && (
        <ul className="ml-5 border-l-2 border-cream-300 pl-4">
          {node.children.map((child) => (
            <NodeItem key={child.person.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeView({ graph }: { graph: FamilyGraph }) {
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
  const nodes = roots
    .map((root) => buildNode(graph, root, visited))
    .filter((node): node is TreeNode => node !== null);

  // Anyone unreachable from a root (data-entry gaps) still deserves a spot.
  const orphans = [...graph.people.values()]
    .filter((p) => !visited.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {nodes.map((node) => (
          <NodeItem key={node.person.id} node={node} />
        ))}
      </ul>
      {orphans.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-lg font-semibold text-brown-700">
            Not yet connected
          </h2>
          <ul className="flex flex-col gap-2">
            {orphans.map((person) => (
              <li key={person.id}>
                <PersonChip person={person} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
