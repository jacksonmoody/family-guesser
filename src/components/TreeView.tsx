import { type FamilyGraph, type Person } from "@/lib/kinship/graph";
import { layoutTree } from "@/lib/kinship/layout";
import { TreeCanvas } from "@/components/TreeCanvas";
import { Avatar } from "@/components/ui/Avatar";

function PersonChip({ person }: { person: Person }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-100 py-1 pl-1 pr-3 shadow-sm">
      <Avatar name={person.name} photoPath={person.photoPath} size="sm" />
      <span className="text-sm font-medium">{person.name}</span>
    </span>
  );
}

function Legend() {
  const swatch = "inline-block size-3 border-2 border-brown-500 bg-cream-50";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brown-700">
      <span className="inline-flex items-center gap-1.5">
        <span className={`${swatch} rounded-[3px]`} /> Male
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`${swatch} rounded-full`} /> Female
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-sage-500" /> Here
        Today!
      </span>
    </div>
  );
}

export function TreeView({ graph }: { graph: FamilyGraph }) {
  const { layout, orphans } = layoutTree(graph);

  return (
    <div className="flex flex-col gap-3">
      <Legend />
      <TreeCanvas layout={layout} />
      {orphans.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-lg font-semibold text-brown-700">
            Not yet connected
          </h2>
          <ul className="flex flex-wrap gap-2">
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
