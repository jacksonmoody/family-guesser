"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Gender, type Person } from "@/lib/kinship/graph";
import {
  NODE_H,
  NODE_W,
  type FamilyDrop,
  type TreeLayout,
} from "@/lib/kinship/layout";
import { Avatar } from "@/components/ui/Avatar";

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const FIT_MARGIN = 24;

interface View {
  x: number;
  y: number;
  scale: number;
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Rescale by `factor`, keeping the viewport point (cx, cy) fixed. */
function zoomAt(view: View, cx: number, cy: number, factor: number): View {
  const scale = clampScale(view.scale * factor);
  const f = scale / view.scale;
  return {
    scale,
    x: cx - (cx - view.x) * f,
    y: cy - (cy - view.y) * f,
  };
}

function shapeFor(gender: Gender): "circle" | "square" | "diamond" {
  if (gender === "male") return "square";
  if (gender === "female") return "circle";
  return "diamond";
}

function dropPath(drop: FamilyDrop): string {
  const barMin = Math.min(drop.midX, ...drop.childXs);
  const barMax = Math.max(drop.midX, ...drop.childXs);
  const parts = [
    `M ${drop.midX} ${drop.parentY} V ${drop.busY}`,
    `M ${barMin} ${drop.busY} H ${barMax}`,
    ...drop.childXs.map((x) => `M ${x} ${drop.busY} V ${drop.childY}`),
  ];
  return parts.join(" ");
}

function PersonNode({
  person,
  x,
  y,
}: {
  person: Person;
  x: number;
  y: number;
}) {
  return (
    <div
      className="absolute z-10 flex flex-col items-center gap-1"
      style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
    >
      <Avatar
        name={person.name}
        photoPath={person.photoPath}
        size="md"
        shape={shapeFor(person.gender)}
      />
      <span className="line-clamp-2 text-center text-xs font-medium leading-tight">
        {person.name}
        {person.attending && (
          <span
            className="ml-1 inline-block size-2 rounded-full bg-sage-500"
            aria-label="Attending"
          />
        )}
      </span>
    </div>
  );
}

export function TreeCanvas({ layout }: { layout: TreeLayout }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const scale = clampScale(
      Math.min(
        (viewport.clientWidth - FIT_MARGIN) / layout.width,
        (viewport.clientHeight - FIT_MARGIN) / layout.height,
        1,
      ),
    );
    setView({
      x: (viewport.clientWidth - layout.width * scale) / 2,
      y: (viewport.clientHeight - layout.height * scale) / 2,
      scale,
    });
  }, [layout.width]);

  useEffect(fitToView, [fitToView]);

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      setView((v) =>
        zoomAt(
          v,
          event.clientX - rect.left,
          event.clientY - rect.top,
          Math.exp(-event.deltaY * 0.002),
        ),
      );
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) return;
    const active = pointers.current;

    if (active.size === 1) {
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (active.size === 2) {
      const other = [...active.entries()].find(
        ([id]) => id !== event.pointerId,
      )?.[1];
      const rect = viewportRef.current?.getBoundingClientRect();
      if (other && rect) {
        const distPrev = Math.hypot(prev.x - other.x, prev.y - other.y);
        const distNow = Math.hypot(
          event.clientX - other.x,
          event.clientY - other.y,
        );
        if (distPrev > 0) {
          const midX = (event.clientX + other.x) / 2 - rect.left;
          const midY = (event.clientY + other.y) / 2 - rect.top;
          setView((v) => zoomAt(v, midX, midY, distNow / distPrev));
        }
      }
    }

    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const zoomFromCenter = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setView((v) =>
      zoomAt(v, viewport.clientWidth / 2, viewport.clientHeight / 2, factor),
    );
  };

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className={`relative h-[70vh] touch-none select-none overflow-hidden rounded-xl border border-cream-300 bg-cream-100/50 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          willChange: "transform",
        }}
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0"
          aria-hidden
        >
          {layout.spouseEdges.map((edge, i) => (
            <line
              key={i}
              x1={edge.x1}
              y1={edge.y}
              x2={edge.x2}
              y2={edge.y}
              stroke="var(--color-brown-300)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
          {layout.drops.map((drop, i) => (
            <path
              key={i}
              d={dropPath(drop)}
              stroke="var(--color-brown-300)"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </svg>
        {layout.nodes.map(({ person, x, y }) => (
          <PersonNode key={person.id} person={person} x={x} y={y} />
        ))}
      </div>

      <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomFromCenter(1.25)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Zoom in"
          className="flex size-8 items-center justify-center rounded-lg border border-cream-300 bg-cream-50 text-lg font-semibold text-brown-700 shadow-sm hover:bg-cream-200"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomFromCenter(0.8)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Zoom out"
          className="flex size-8 items-center justify-center rounded-lg border border-cream-300 bg-cream-50 text-lg font-semibold text-brown-700 shadow-sm hover:bg-cream-200"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitToView}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Reset view"
          className="flex size-8 items-center justify-center rounded-lg border border-cream-300 bg-cream-50 text-xs font-semibold text-brown-700 shadow-sm hover:bg-cream-200"
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
