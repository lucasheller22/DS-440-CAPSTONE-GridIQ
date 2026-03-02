import { useState } from "react";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/primitives/Button";

function FootballField({ routes }: { routes: Array<{ from: [number, number]; to: [number, number] }> }) {
  // Simple SVG field placeholder (0..100 x, 0..53.3 y)
  const w = 900;
  const h = 480;

  const x = (yd: number) => (yd / 100) * w;
  const y = (sideline: number) => (sideline / 53.3) * h;

  return (
    <svg className="w-full rounded-2xl border border-gray-200 bg-green-50" viewBox={`0 0 ${w} ${h}`}>
      {/* Yard lines */}
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={(i * w) / 10} y1={0} x2={(i * w) / 10} y2={h} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
      ))}
      {/* Hash marks (rough) */}
      <line x1={0} y1={y(20)} x2={w} y2={y(20)} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
      <line x1={0} y1={y(33.3)} x2={w} y2={y(33.3)} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />

      {/* Routes */}
      {routes.map((r, i) => (
        <path
          key={i}
          d={`M ${x(r.from[0])} ${y(r.from[1])} L ${x(r.to[0])} ${y(r.to[1])}`}
          stroke="rgba(0,0,0,0.7)"
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export default function Playbook() {
  const [routes, setRoutes] = useState<Array<{ from: [number, number]; to: [number, number] }>>([
    { from: [20, 10], to: [45, 8] }, // outside go-ish
    { from: [20, 26], to: [40, 26] }, // drag
    { from: [20, 45], to: [38, 40] }, // out
  ]);

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
            <FootballField routes={routes} />
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
              setRoutes((r) => [
                ...r,
                { from: [20, 32], to: [55, 32] }, // seam
              ])
            }
          >
            Add seam route
          </Button>
          <Button
            variant="ghost"
            onClick={() => setRoutes([{ from: [25, 26], to: [60, 26] }])}
          >
            Reset to single route
          </Button>
        </Card>
      </div>
    </div>
  );
}
