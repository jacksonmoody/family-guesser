"use client";

import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import {
  Background,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  addParentLink,
  addSpouseLink,
  deleteParentLink,
  deleteSpouseLink,
  type ActionResult,
} from "@/app/actions/admin";
import { type Database } from "@/lib/database.types";
import { ancestorDepths, buildGraph, type Person } from "@/lib/kinship/graph";
import { layoutTree, NODE_H, NODE_W, PAD } from "@/lib/kinship/layout";
import { Avatar } from "@/components/ui/Avatar";
import { PersonFlowNode, type PersonFlowNodeType } from "./PersonFlowNode";
import { ParentEdge, SpouseEdge } from "./edges";

type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type ParentLinkRow = Database["public"]["Tables"]["parent_links"]["Row"];
type SpouseLinkRow = Database["public"]["Tables"]["spouses"]["Row"];

const nodeTypes = { person: PersonFlowNode };
const edgeTypes = { spouse: SpouseEdge, parentLink: ParentEdge };

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    attending: row.attending,
    photoPath: row.photo_path,
  };
}

type ParentAction = {
  type: "add" | "remove";
  parentId: string;
  childId: string;
};
function parentReducer(
  state: ParentLinkRow[],
  action: ParentAction,
): ParentLinkRow[] {
  if (action.type === "add") {
    return [...state, { parent_id: action.parentId, child_id: action.childId }];
  }
  return state.filter(
    (l) => !(l.parent_id === action.parentId && l.child_id === action.childId),
  );
}

type SpouseAction = { type: "add" | "remove"; a: string; b: string };
function spouseReducer(
  state: SpouseLinkRow[],
  action: SpouseAction,
): SpouseLinkRow[] {
  // Same canonical pair order the DB uses (person1_id < person2_id).
  const [p1, p2] =
    action.a < action.b ? [action.a, action.b] : [action.b, action.a];
  if (action.type === "add") {
    return [...state, { person1_id: p1, person2_id: p2 }];
  }
  return state.filter((l) => !(l.person1_id === p1 && l.person2_id === p2));
}

/**
 * Derive the React Flow scene from the family data. People placed by the
 * genogram layout are fixed; staged people (dragged in from the palette but
 * not linked yet) float freely until a link pulls them into the layout.
 */
function buildFlow(
  people: PersonRow[],
  parentRows: ParentLinkRow[],
  spouseRows: SpouseLinkRow[],
  staged: Record<string, XYPosition>,
) {
  const parentLinks = parentRows.map((l) => ({
    parentId: l.parent_id,
    childId: l.child_id,
  }));
  const spouseLinks = spouseRows.map((l) => ({
    person1Id: l.person1_id,
    person2Id: l.person2_id,
  }));
  const graph = buildGraph(people.map(toPerson), parentLinks, spouseLinks);

  // People with no links stay in the palette; layoutTree would otherwise
  // place each of them as a single-node root tree.
  const linked = new Set<string>();
  for (const l of parentLinks) {
    linked.add(l.parentId);
    linked.add(l.childId);
  }
  for (const l of spouseLinks) {
    linked.add(l.person1Id);
    linked.add(l.person2Id);
  }
  const layoutGraph = buildGraph(
    people.filter((p) => linked.has(p.id)).map(toPerson),
    parentLinks,
    spouseLinks,
  );
  const { layout, orphans } = layoutTree(layoutGraph);
  const unlinked = people
    .filter((p) => !linked.has(p.id))
    .map(toPerson)
    .sort((a, b) => a.name.localeCompare(b.name));

  const nodes: PersonFlowNodeType[] = layout.nodes.map(({ person, x, y }) => ({
    id: person.id,
    type: "person",
    position: { x, y },
    data: { person },
    draggable: false,
    deletable: false,
  }));
  const canvasX = new Map(nodes.map((n) => [n.id, n.position.x]));

  for (const [id, position] of Object.entries(staged)) {
    if (canvasX.has(id)) continue;
    const person = graph.people.get(id);
    if (!person) continue;
    nodes.push({
      id,
      type: "person",
      position,
      data: { person },
      draggable: true,
      deletable: false,
    });
    canvasX.set(id, position.x);
  }

  const edges: Edge[] = [];
  for (const row of spouseRows) {
    const xa = canvasX.get(row.person1_id);
    const xb = canvasX.get(row.person2_id);
    if (xa === undefined || xb === undefined) continue;
    // Anchor the line on the facing sides of the two cards.
    const [source, target] =
      xa <= xb
        ? [row.person1_id, row.person2_id]
        : [row.person2_id, row.person1_id];
    edges.push({
      id: `s:${row.person1_id}:${row.person2_id}`,
      source,
      sourceHandle: "spouse-r",
      target,
      targetHandle: "spouse-l",
      type: "spouse",
    });
  }
  for (const row of parentRows) {
    if (!canvasX.has(row.parent_id) || !canvasX.has(row.child_id)) continue;
    edges.push({
      id: `p:${row.parent_id}:${row.child_id}`,
      source: row.parent_id,
      sourceHandle: "child",
      target: row.child_id,
      targetHandle: "parent",
      type: "parentLink",
    });
  }

  return {
    graph,
    nodes,
    edges,
    // Cycle-broken people (layout orphans) join the unlinked in the palette.
    orphans: [...unlinked, ...orphans].filter((p) => !(p.id in staged)),
    layoutHeight: layout.height,
  };
}

function isValidConnection(conn: Connection | Edge): boolean {
  if (conn.source === conn.target) return false;
  const s = conn.sourceHandle ?? "";
  const t = conn.targetHandle ?? "";
  const spouse = s.startsWith("spouse") && t.startsWith("spouse");
  const parent =
    (s === "child" && t === "parent") || (s === "parent" && t === "child");
  return spouse || parent;
}

function TreeEditorInner({
  people,
  parentLinks,
  spouseLinks,
}: {
  people: PersonRow[];
  parentLinks: ParentLinkRow[];
  spouseLinks: SpouseLinkRow[];
}) {
  const [optimisticParents, mutateParents] = useOptimistic(
    parentLinks,
    parentReducer,
  );
  const [optimisticSpouses, mutateSpouses] = useOptimistic(
    spouseLinks,
    spouseReducer,
  );
  const [staged, setStaged] = useState<Record<string, XYPosition>>({});
  const [error, setError] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);

  const flow = buildFlow(people, optimisticParents, optimisticSpouses, staged);
  const { graph, orphans, layoutHeight } = flow;

  const [nodes, setNodes, onNodesChange] = useNodesState<PersonFlowNodeType>(
    flow.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flow.edges);

  // Re-sync React Flow whenever the derived scene actually changes,
  // preserving edge selection so the delete button doesn't vanish.
  // Keyed on content, not array identity: while a transition is pending,
  // useOptimistic recomputes its value (new identity) on every render, and
  // identity-based deps would loop setNodes → render → effect forever.
  const flowKey = JSON.stringify({
    nodes: flow.nodes.map((n) => [
      n.id,
      n.position.x,
      n.position.y,
      n.data.person,
    ]),
    edges: flow.edges.map((e) => e.id),
  });
  useEffect(() => {
    // Reuse unchanged node/edge objects so React Flow keeps its measurements
    // (and selection); replacing every object forces a re-measure that makes
    // all edges flash out for a frame.
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return flow.nodes.map((n) => {
        const old = prevById.get(n.id);
        return old &&
          old.position.x === n.position.x &&
          old.position.y === n.position.y &&
          old.draggable === n.draggable &&
          JSON.stringify(old.data.person) === JSON.stringify(n.data.person)
          ? old
          : n;
      });
    });
    setEdges((prev) => {
      const prevById = new Map(prev.map((e) => [e.id, e]));
      return flow.edges.map((e) => prevById.get(e.id) ?? e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow is re-derived every render; flowKey captures its content
  }, [flowKey, setNodes, setEdges]);

  const runMutation = (
    apply: () => void,
    action: () => Promise<ActionResult>,
  ) => {
    setError(null);
    startTransition(async () => {
      apply();
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong");
    });
  };

  const onConnect = (conn: Connection) => {
    const s = conn.sourceHandle ?? "";
    if (s.startsWith("spouse")) {
      const [a, b] = [conn.source, conn.target];
      if ((graph.spouses.get(a) ?? []).includes(b)) return;
      runMutation(
        () => mutateSpouses({ type: "add", a, b }),
        () => addSpouseLink(a, b),
      );
    } else {
      // The bottom ("child") handle sits on the parent's card.
      const parentId = s === "child" ? conn.source : conn.target;
      const childId = s === "child" ? conn.target : conn.source;
      if ((graph.parents.get(childId) ?? []).includes(parentId)) return;
      if (ancestorDepths(graph, parentId).has(childId)) {
        setError("That link would create an ancestry loop");
        return;
      }
      runMutation(
        () => mutateParents({ type: "add", parentId, childId }),
        () => addParentLink(parentId, childId),
      );
    }
  };

  const onEdgesDelete = (deleted: Edge[]) => {
    for (const edge of deleted) {
      const [kind, a, b] = edge.id.split(":");
      if (kind === "s") {
        runMutation(
          () => mutateSpouses({ type: "remove", a, b }),
          () => deleteSpouseLink(a, b),
        );
      } else {
        runMutation(
          () => mutateParents({ type: "remove", parentId: a, childId: b }),
          () => deleteParentLink(a, b),
        );
      }
    }
  };

  const stagePerson = (id: string, position: XYPosition) => {
    setStaged((prev) => ({ ...prev, [id]: position }));
  };

  // Tap-to-stage drops the person at the center of the current view (plus a
  // small stagger), so they always land somewhere visible.
  const stageAtViewCenter = (id: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const offset = Object.keys(staged).length * 24;
    const pos = rect
      ? screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      : { x: PAD + offset, y: layoutHeight + 40 };
    stagePerson(id, {
      x: pos.x - NODE_W / 2 + offset,
      y: pos.y - NODE_H / 2 + offset,
    });
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-person-id");
    if (!id) return;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    stagePerson(id, { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-xl bg-terracotta-500/10 px-3 py-2 text-sm text-terracotta-600">
          {error}
        </p>
      )}

      {orphans.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-brown-500">
            People not on the family tree:
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {orphans.map((person) => (
              <li key={person.id} className="shrink-0">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-person-id",
                      person.id,
                    );
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => stageAtViewCenter(person.id)}
                  className="inline-flex cursor-grab items-center gap-2 rounded-full border border-cream-300 bg-cream-100 py-1 pl-1 pr-3 shadow-sm hover:bg-cream-200"
                >
                  <Avatar
                    name={person.name}
                    photoPath={person.photoPath}
                    size="sm"
                  />
                  <span className="text-sm font-medium">{person.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={canvasRef}
        className="h-[70vh] overflow-hidden rounded-xl border border-cream-300 bg-cream-100/50"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={(_event, node) =>
            setStaged((prev) =>
              prev[node.id] ? { ...prev, [node.id]: node.position } : prev,
            )
          }
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{
            stroke: "#78716c",
            strokeWidth: 2,
          }}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          minZoom={0.3}
          maxZoom={2.5}
          deleteKeyCode={["Backspace", "Delete"]}
          style={{ backgroundColor: "transparent" }}
        >
          <Background gap={24} size={1.5} color="var(--color-cream-300)" />
        </ReactFlow>
      </div>
    </div>
  );
}

export function TreeEditor(props: {
  people: PersonRow[];
  parentLinks: ParentLinkRow[];
  spouseLinks: SpouseLinkRow[];
}) {
  return (
    <ReactFlowProvider>
      <TreeEditorInner {...props} />
    </ReactFlowProvider>
  );
}
