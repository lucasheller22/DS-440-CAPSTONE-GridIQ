import { useRef, useState, type PointerEvent } from "react";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/primitives/Button";

type Route = { id: string; name: string; from: [number, number]; to: [number, number] };

type DragState =
  | { routeId: string; endpoint: "from" | "to" | "both"; startX: number; startY: number; initialFrom: [number, number]; initialTo: [number, number] }
  | null;

function FootballField({
  routes,
  onDrag,
  onDragEnd,
}: {
  routes: Route[];
  onDrag: (routeId: string, endpoint: "from" | "to" | "both", x: number, y: number) => void;
  onDragEnd: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Simple SVG field placeholder (0..100 x, 0..53.3 y)
  const w = 900;
  const h = 480;

  const x = (yd: number) => (yd / 100) * w;
  const y = (sideline: number) => (sideline / 53.3) * h;

  const toYard = (evt: PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const rx = Math.max(0, Math.min(100, (svgP.x / w) * 100));
    const ry = Math.max(0, Math.min(53.3, (svgP.y / h) * 53.3));
    return { x: rx, y: ry };
  };

  const [dragState, setDragState] = useState<DragState>(null);

  return (
    <svg
      ref={svgRef}
      className="w-full rounded-2xl border border-gray-200 bg-green-50"
      viewBox={`0 0 ${w} ${h}`}
      onPointerMove={(e) => {
        if (!dragState) return;
        const pos = toYard(e);
        if (!pos) return;

        if (dragState.endpoint === "both") {
          const dx = pos.x - dragState.startX;
          const dy = pos.y - dragState.startY;
          const newFrom = [dragState.initialFrom[0] + dx, dragState.initialFrom[1] + dy] as [number, number];
          const newTo = [dragState.initialTo[0] + dx, dragState.initialTo[1] + dy] as [number, number];
          onDrag(dragState.routeId, "from", newFrom[0], newFrom[1]);
          onDrag(dragState.routeId, "to", newTo[0], newTo[1]);
        } else {
          onDrag(dragState.routeId, dragState.endpoint, pos.x, pos.y);
        }
      }}
      onPointerUp={() => {
        if (dragState) {
          setDragState(null);
          onDragEnd();
        }
      }}
    >
      {/* Yard lines */}
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={(i * w) / 10} y1={0} x2={(i * w) / 10} y2={h} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
      ))}
      {/* Hash marks (rough) */}
      <line x1={0} y1={y(20)} x2={w} y2={y(20)} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
      <line x1={0} y1={y(33.3)} x2={w} y2={y(33.3)} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />

      {/* Routes */}
      {routes.map((r) => (
        <g key={r.id}>
          <path
            d={`M ${x(r.from[0])} ${y(r.from[1])} L ${x(r.to[0])} ${y(r.to[1])}`}
            stroke="rgba(0,0,0,0.7)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const yard = toYard(e);
              if (!yard) return;
              setDragState({ routeId: r.id, endpoint: "both", startX: yard.x, startY: yard.y, initialFrom: r.from, initialTo: r.to });
            }}
          />
          <circle
            cx={x(r.from[0])}
            cy={y(r.from[1])}
            r={8}
            fill="white"
            stroke="rgba(0,0,0,0.9)"
            strokeWidth={2}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const yard = toYard(e);
              if (!yard) return;
              setDragState({ routeId: r.id, endpoint: "from", startX: yard.x, startY: yard.y, initialFrom: r.from, initialTo: r.to });
            }}
          />
          <circle
            cx={x(r.to[0])}
            cy={y(r.to[1])}
            r={8}
            fill="white"
            stroke="rgba(0,0,0,0.9)"
            strokeWidth={2}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const yard = toYard(e);
              if (!yard) return;
              setDragState({ routeId: r.id, endpoint: "to", startX: yard.x, startY: yard.y, initialFrom: r.from, initialTo: r.to });
            }}
          />
        </g>
      ))}
    </svg>
  );
}

const factoryRoute = (id: string, name: string, from: [number, number], to: [number, number]): Route => ({ id, name, from, to });

export default function Playbook() {
  const [routes, setRoutes] = useState<Route[]>([
    factoryRoute("r1", "outside-go", [20, 10], [45, 8]),
    factoryRoute("r2", "drag", [20, 26], [40, 26]),
    factoryRoute("r3", "out", [20, 45], [38, 40]),
  ]);

  const dragRoute = (routeId: string, endpoint: "from" | "to" | "both", x: number, y: number) => {
    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== routeId) return route;

        if (endpoint === "from") return { ...route, from: [x, y] };
        if (endpoint === "to") return { ...route, to: [x, y] };
        return route;
      }),
    );
  };

  const addRoute = (name: string, from: [number, number], to: [number, number]) => {
    setRoutes((old) => [...old, factoryRoute(`r_${Date.now()}`, name, from, to)]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Playbook</div>
        <div className="mt-1 text-sm text-gray-600">
          A placeholder play visualizer. Later, map routes from your NFL play data or user-created concepts.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <FootballField routes={routes} onDrag={dragRoute} onDragEnd={() => {}} />
          </Card>
        </div>
        <Card className="space-y-3">
          <div className="text-sm font-semibold">Controls</div>
          <div className="text-sm text-gray-600">
            This is intentionally minimal. Next step is to add player nodes, route curves, and formation templates.
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              addRoute("curl", [20, 18], [40, 23])
            }
          >
            Add curl route
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              addRoute("dagger", [20, 48], [52, 25])
            }
          >
            Add dagger route
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              addRoute("corner", [20, 46], [48, 28])
            }
          >
            Add corner route
          </Button>
          <Button
            variant="ghost"
            onClick={() => setRoutes([factoryRoute("r_reset", "seam", [20, 32], [55, 32])])}
          >
            Reset to single route
          </Button>
        </Card>
      </div>
    </div>
  );
}
