import { useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/primitives/Button";

type PlayerRole = "QB" | "WR" | "RB" | "TE" | "CB" | "LB" | "S";

type OffenseRouteKind = "run" | "pass" | "block";
type DefensiveCoverageKind = "zone" | "man" | "blitz";

type FieldPlayer = {
  id: string;
  role: PlayerRole;
  side: "offense" | "defense";
  x: number;
  y: number;
  /** WR / TE / RB only */
  routeKind?: OffenseRouteKind;
  routeWaypoints?: [number, number][];
  /** Defense only */
  coverage?: DefensiveCoverageKind;
  defZoneRx?: number;
  defZoneRy?: number;
  manRadiusYards?: number;
};

const PLAYING_FIELD_YARDS = 100;
const ENDZONE_YARDS = 10;
const TOTAL_LENGTH_YARDS = ENDZONE_YARDS + PLAYING_FIELD_YARDS + ENDZONE_YARDS;
const FIELD_H_YARDS = 53.3;

const TURF_PLAY = "#3d9349";
const TURF_ENDZONE = "#2a6b38";
const TURF_BORDER = "#1f4d2c";

const ROUTE_YELLOW = "#facc15";
const ROUTE_STROKE = "#ca8a04";
const RUN_RED = "#ef4444";
const RUN_RED_STROKE = "#b91c1c";
const BLOCK_GREY = "#9ca3af";
const BLOCK_GREY_STROKE = "#374151";

const DEF_ZONE_FILL = "#2563eb";
const DEF_ZONE_STROKE = "#1d4ed8";
const MAN_YELLOW = "#facc15";
const MAN_YELLOW_STROKE = "#a16207";

const LOS_COLOR = "#000000";
const FIRST_DOWN_COLOR = "#f97316";

const MIN_ZONE_R = 1.5;
const MAX_ZONE_RX = 22;
const MAX_ZONE_RY = 16;
const MIN_MAN_RADIUS_YARDS = 2;
const MAX_MAN_RADIUS_YARDS = 14;

const OFFENSE_COUNT = 6;
const DEFENSE_COUNT = 6;

function isSkillRole(role: PlayerRole): boolean {
  return role === "WR" || role === "TE" || role === "RB";
}

function yardLineNumber(xi: number): string | null {
  if (xi % 10 !== 0) return null;
  const leftGoal = ENDZONE_YARDS;
  const rightGoal = ENDZONE_YARDS + PLAYING_FIELD_YARDS;
  if (xi <= leftGoal || xi >= rightGoal) return null;
  const n = Math.min(xi - leftGoal, rightGoal - xi);
  return String(n);
}

function playerById(players: FieldPlayer[], id: string): FieldPlayer | undefined {
  return players.find((p) => p.id === id);
}

function shortenSegmentEnd(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  shortenPx: number,
): [number, number] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [x2, y2];
  if (len <= shortenPx * 2) return [x2, y2];
  const ux = dx / len;
  const uy = dy / len;
  return [x2 - ux * shortenPx, y2 - uy * shortenPx];
}

function polylinePointsSvg(
  player: FieldPlayer,
  waypoints: [number, number][],
  xSvg: (x: number) => number,
  ySvg: (y: number) => number,
  shortenLastPx: number,
): { pointsAttr: string } {
  const pts: [number, number][] = [[player.x, player.y], ...waypoints];
  const svgPts = pts.map(([px, py]) => [xSvg(px), ySvg(py)] as [number, number]);
  if (svgPts.length < 2) {
    return { pointsAttr: "" };
  }
  const n = svgPts.length;
  const [lx1, ly1] = svgPts[n - 2]!;
  const [lx2, ly2] = svgPts[n - 1]!;
  const [ex, ey] = shortenSegmentEnd(lx1, ly1, lx2, ly2, shortenLastPx);
  const allButLast = svgPts.slice(0, -1).map(([a, b]) => `${a},${b}`);
  const pointsAttr = [...allButLast, `${ex},${ey}`].join(" ");
  return { pointsAttr };
}

type MarkerDrag = "los" | "fd" | null;

type SkillRouteDrag =
  | {
      playerId: string;
      mode: "whole";
      startX: number;
      startY: number;
      initialPlayer: FieldPlayer;
      initialWaypoints: [number, number][];
    }
  | {
      playerId: string;
      mode: "vertex";
      vertexIndex: number;
    }
  | null;

type DefResizeDrag =
  | { playerId: string; kind: "zone-rx"; cx: number; cy: number }
  | { playerId: string; kind: "zone-ry"; cx: number; cy: number }
  | { playerId: string; kind: "man-r"; cx: number; cy: number }
  | null;

type PlayerDragState = {
  playerId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
} | null;

function FootballField({
  players,
  lineOfScrimmageX,
  firstDownX,
  onPlayerMove,
  onSkillRouteWaypoints,
  onSkillRouteWholeFromInitial,
  onDefCoveragePatch,
  onMarkerX,
}: {
  players: FieldPlayer[];
  lineOfScrimmageX: number;
  firstDownX: number;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
  onSkillRouteWaypoints: (playerId: string, waypoints: [number, number][]) => void;
  onSkillRouteWholeFromInitial: (
    playerId: string,
    dx: number,
    dy: number,
    initial: { x: number; y: number; waypoints: [number, number][] },
  ) => void;
  onDefCoveragePatch: (
    playerId: string,
    patch: Partial<Pick<FieldPlayer, "defZoneRx" | "defZoneRy" | "manRadiusYards">>,
  ) => void;
  onMarkerX: (which: "los" | "fd", x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reactId = useId().replace(/:/g, "");
  const passArrowId = `arr-pass-${reactId}`;
  const runArrowId = `arr-run-${reactId}`;
  const blockArrowId = `arr-block-${reactId}`;
  const blitzArrowId = `arr-blitz-${reactId}`;
  const w = 900;
  const h = 480;

  const xSvg = (yd: number) => (yd / TOTAL_LENGTH_YARDS) * w;
  const ySvg = (sideline: number) => (sideline / FIELD_H_YARDS) * h;

  const toYard = (evt: PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const rx = Math.max(0, Math.min(TOTAL_LENGTH_YARDS, (svgP.x / w) * TOTAL_LENGTH_YARDS));
    const ry = Math.max(0, Math.min(FIELD_H_YARDS, (svgP.y / h) * FIELD_H_YARDS));
    return { x: rx, y: ry };
  };

  const qb = useMemo(() => players.find((p) => p.side === "offense" && p.role === "QB"), [players]);

  const [playerDrag, setPlayerDrag] = useState<PlayerDragState>(null);
  const [markerDrag, setMarkerDrag] = useState<MarkerDrag>(null);
  const [skillRouteDrag, setSkillRouteDrag] = useState<SkillRouteDrag>(null);
  const [defResizeDrag, setDefResizeDrag] = useState<DefResizeDrag>(null);

  const distanceYards = Math.abs(firstDownX - lineOfScrimmageX);

  const losPx = xSvg(lineOfScrimmageX);
  const fdPx = xSvg(firstDownX);

  return (
    <svg
      ref={svgRef}
      className="w-full rounded-2xl border touch-none select-none"
      style={{ borderColor: TURF_BORDER, background: TURF_PLAY }}
      viewBox={`0 0 ${w} ${h}`}
      onPointerMove={(e) => {
        const pos = toYard(e);
        if (!pos) return;

        if (playerDrag) {
          const dx = pos.x - playerDrag.startX;
          const dy = pos.y - playerDrag.startY;
          let nx = playerDrag.initialX + dx;
          let ny = playerDrag.initialY + dy;
          nx = Math.max(0, Math.min(TOTAL_LENGTH_YARDS, nx));
          ny = Math.max(0, Math.min(FIELD_H_YARDS, ny));
          onPlayerMove(playerDrag.playerId, nx, ny);
          return;
        }

        if (markerDrag) {
          let nx = Math.max(ENDZONE_YARDS, Math.min(ENDZONE_YARDS + PLAYING_FIELD_YARDS, pos.x));
          onMarkerX(markerDrag, nx);
          return;
        }

        if (defResizeDrag) {
          const pl = playerById(players, defResizeDrag.playerId);
          if (!pl) return;
          if (defResizeDrag.kind === "zone-rx") {
            const nrx = Math.max(MIN_ZONE_R, Math.min(MAX_ZONE_RX, Math.abs(pos.x - defResizeDrag.cx)));
            onDefCoveragePatch(defResizeDrag.playerId, { defZoneRx: nrx });
          } else if (defResizeDrag.kind === "zone-ry") {
            const nry = Math.max(MIN_ZONE_R, Math.min(MAX_ZONE_RY, Math.abs(pos.y - defResizeDrag.cy)));
            onDefCoveragePatch(defResizeDrag.playerId, { defZoneRy: nry });
          } else {
            const dist = Math.hypot(pos.x - defResizeDrag.cx, pos.y - defResizeDrag.cy);
            const r = Math.max(MIN_MAN_RADIUS_YARDS, Math.min(MAX_MAN_RADIUS_YARDS, dist));
            onDefCoveragePatch(defResizeDrag.playerId, { manRadiusYards: r });
          }
          return;
        }

        if (skillRouteDrag) {
          if (skillRouteDrag.mode === "whole") {
            const dx = pos.x - skillRouteDrag.startX;
            const dy = pos.y - skillRouteDrag.startY;
            onSkillRouteWholeFromInitial(skillRouteDrag.playerId, dx, dy, {
              x: skillRouteDrag.initialPlayer.x,
              y: skillRouteDrag.initialPlayer.y,
              waypoints: skillRouteDrag.initialWaypoints,
            });
          } else {
            const pl = playerById(players, skillRouteDrag.playerId);
            if (!pl?.routeWaypoints) return;
            const next = pl.routeWaypoints.map((wp, i) =>
              i === skillRouteDrag.vertexIndex
                ? ([Math.max(0, Math.min(TOTAL_LENGTH_YARDS, pos.x)), Math.max(0, Math.min(FIELD_H_YARDS, pos.y))] as [
                    number,
                    number,
                  ])
                : wp,
            );
            onSkillRouteWaypoints(skillRouteDrag.playerId, next);
          }
          return;
        }
      }}
      onPointerUp={() => {
        setPlayerDrag(null);
        setMarkerDrag(null);
        setSkillRouteDrag(null);
        setDefResizeDrag(null);
      }}
    >
      <defs>
        <marker id={passArrowId} viewBox="0 0 10 10" markerWidth="14" markerHeight="14" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ROUTE_YELLOW} stroke={ROUTE_STROKE} strokeWidth="0.75" />
        </marker>
        <marker id={runArrowId} viewBox="0 0 10 10" markerWidth="14" markerHeight="14" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={RUN_RED} stroke={RUN_RED_STROKE} strokeWidth="0.75" />
        </marker>
        <marker id={blockArrowId} viewBox="0 0 10 10" markerWidth="14" markerHeight="14" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={BLOCK_GREY} stroke={BLOCK_GREY_STROKE} strokeWidth="0.75" />
        </marker>
        <marker id={blitzArrowId} viewBox="0 0 10 10" markerWidth="14" markerHeight="14" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={RUN_RED} stroke={RUN_RED_STROKE} strokeWidth="0.75" />
        </marker>
      </defs>

      <rect x={0} y={0} width={xSvg(ENDZONE_YARDS)} height={h} fill={TURF_ENDZONE} />
      <rect x={xSvg(ENDZONE_YARDS)} y={0} width={xSvg(ENDZONE_YARDS + PLAYING_FIELD_YARDS) - xSvg(ENDZONE_YARDS)} height={h} fill={TURF_PLAY} />
      <rect x={xSvg(ENDZONE_YARDS + PLAYING_FIELD_YARDS)} y={0} width={w - xSvg(ENDZONE_YARDS + PLAYING_FIELD_YARDS)} height={h} fill={TURF_ENDZONE} />

      {Array.from({ length: PLAYING_FIELD_YARDS + 1 }, (_, i) => ENDZONE_YARDS + i).map((xi) => {
        const xPx = xSvg(xi);
        const isGoal = xi === ENDZONE_YARDS || xi === ENDZONE_YARDS + PLAYING_FIELD_YARDS;
        const isTen = xi % 10 === 0;
        const stroke = isGoal ? "#ffffff" : isTen ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)";
        const sw = isGoal ? 4 : isTen ? 2.5 : 1;
        return <line key={xi} x1={xPx} y1={0} x2={xPx} y2={h} stroke={stroke} strokeWidth={sw} />;
      })}

      {Array.from({ length: PLAYING_FIELD_YARDS + 1 }, (_, i) => ENDZONE_YARDS + i).map((xi) => {
        const label = yardLineNumber(xi);
        if (!label) return null;
        const xPx = xSvg(xi);
        return (
          <g key={`n-${xi}`} className="pointer-events-none">
            <text x={xPx} y={ySvg(8)} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.92)" fontSize={17} fontWeight={800} fontFamily="system-ui,sans-serif" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
              {label}
            </text>
            <text x={xPx} y={ySvg(FIELD_H_YARDS - 8)} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.92)" fontSize={17} fontWeight={800} fontFamily="system-ui,sans-serif" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
              {label}
            </text>
          </g>
        );
      })}

      <line x1={0} y1={ySvg(20)} x2={w} y2={ySvg(20)} stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} />
      <line x1={0} y1={ySvg(33.3)} x2={w} y2={ySvg(33.3)} stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} />

      {/* Distance to gain (always positive) */}
      <g className="pointer-events-none">
        <rect x={w / 2 - 72} y={8} width={144} height={28} rx={6} fill="rgba(0,0,0,0.55)" />
        <text x={w / 2} y={24} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={14} fontWeight={700} fontFamily="system-ui,sans-serif">
          {distanceYards.toFixed(1)} yd to gain
        </text>
      </g>

      {/* Line of scrimmage + first down */}
      <line x1={losPx} y1={0} x2={losPx} y2={h} stroke={LOS_COLOR} strokeWidth={5} strokeLinecap="square" />
      <rect
        x={losPx - 14}
        y={h * 0.42}
        width={28}
        height={56}
        fill="transparent"
        className="cursor-ew-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMarkerDrag("los");
        }}
      />
      <line x1={fdPx} y1={0} x2={fdPx} y2={h} stroke={FIRST_DOWN_COLOR} strokeWidth={5} strokeLinecap="square" />
      <rect
        x={fdPx - 14}
        y={h * 0.42}
        width={28}
        height={56}
        fill="transparent"
        className="cursor-ew-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMarkerDrag("fd");
        }}
      />

      {/* Defender zone fills (under routes) */}
      {players
        .filter((p) => p.side === "defense" && p.coverage === "zone")
        .map((p) => {
          const zx = xSvg(p.x);
          const zy = ySvg(p.y);
          const rx = ((p.defZoneRx ?? 6) / TOTAL_LENGTH_YARDS) * w;
          const ry = ((p.defZoneRy ?? 4) / FIELD_H_YARDS) * h;
          return (
            <ellipse key={`dz-${p.id}`} cx={zx} cy={zy} rx={rx} ry={ry} fill={DEF_ZONE_FILL} stroke={DEF_ZONE_STROKE} strokeWidth={2} className="pointer-events-none" />
          );
        })}

      {/* Defender man fills */}
      {players
        .filter((p) => p.side === "defense" && p.coverage === "man")
        .map((p) => {
          const zx = xSvg(p.x);
          const zy = ySvg(p.y);
          const mr = ((p.manRadiusYards ?? 4) / TOTAL_LENGTH_YARDS) * w;
          const mry = ((p.manRadiusYards ?? 4) / FIELD_H_YARDS) * h;
          return <ellipse key={`dm-${p.id}`} cx={zx} cy={zy} rx={mr} ry={mry} fill={MAN_YELLOW} stroke={MAN_YELLOW_STROKE} strokeWidth={2} className="pointer-events-none" />;
        })}

      {/* Blitz arrows toward QB */}
      {qb &&
        players
          .filter((p) => p.side === "defense" && p.coverage === "blitz")
          .map((p) => {
            const x1 = xSvg(p.x);
            const y1 = ySvg(p.y);
            const x2a = xSvg(qb.x);
            const y2a = ySvg(qb.y);
            const [ex, ey] = shortenSegmentEnd(x1, y1, x2a, y2a, 20);
            return (
              <line
                key={`bz-${p.id}`}
                x1={x1}
                y1={y1}
                x2={ex}
                y2={ey}
                stroke={RUN_RED}
                strokeWidth={4}
                strokeLinecap="round"
                markerEnd={`url(#${blitzArrowId})`}
                className="pointer-events-none"
              />
            );
          })}

      {/* Skill routes (polyline + arrow) */}
      {players
        .filter((p) => p.side === "offense" && isSkillRole(p.role) && p.routeKind && p.routeWaypoints?.length)
        .map((p) => {
          const stroke =
            p.routeKind === "pass" ? ROUTE_YELLOW : p.routeKind === "run" ? RUN_RED : BLOCK_GREY;
          const mid =
            p.routeKind === "pass" ? passArrowId : p.routeKind === "run" ? runArrowId : blockArrowId;
          const { pointsAttr } = polylinePointsSvg(p, p.routeWaypoints!, xSvg, ySvg, 16);
          return (
            <g key={`rt-${p.id}`}>
              <polyline
                points={pointsAttr}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const yard = toYard(e);
                  if (!yard) return;
                  setSkillRouteDrag({
                    playerId: p.id,
                    mode: "whole",
                    startX: yard.x,
                    startY: yard.y,
                    initialPlayer: { ...p },
                    initialWaypoints: (p.routeWaypoints ?? []).map((w) => [w[0], w[1]] as [number, number]),
                  });
                }}
              />
              <polyline points={pointsAttr} fill="none" stroke={stroke} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" markerEnd={`url(#${mid})`} className="pointer-events-none" />
            </g>
          );
        })}

      {/* Vertex handles for skill routes */}
      {players
        .filter((p) => p.side === "offense" && isSkillRole(p.role) && p.routeWaypoints?.length)
        .map((p) =>
          p.routeWaypoints!.map((wp, i) => (
            <circle
              key={`${p.id}-v-${i}`}
              cx={xSvg(wp[0])}
              cy={ySvg(wp[1])}
              r={7}
              fill="white"
              stroke={p.routeKind === "pass" ? ROUTE_STROKE : p.routeKind === "run" ? RUN_RED_STROKE : BLOCK_GREY_STROKE}
              strokeWidth={2}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSkillRouteDrag({ playerId: p.id, mode: "vertex", vertexIndex: i });
              }}
            />
          )),
        )}

      {/* Players */}
      {players.map((p) => {
        const px = xSvg(p.x);
        const py = ySvg(p.y);
        const isOff = p.side === "offense";
        const fill = isOff ? "#fef08a" : "#fecaca";
        const stroke = isOff ? "#854d0e" : "#991b1b";
        const labelFill = isOff ? "#422006" : "#450a0a";
        return (
          <g
            key={p.id}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const yard = toYard(e);
              if (!yard) return;
              setPlayerDrag({
                playerId: p.id,
                startX: yard.x,
                startY: yard.y,
                initialX: p.x,
                initialY: p.y,
              });
            }}
          >
            <circle cx={px} cy={py} r={15} fill={fill} stroke={stroke} strokeWidth={2} />
            <text x={px} y={py} textAnchor="middle" dominantBaseline="central" fill={labelFill} fontSize={11} fontWeight={700} fontFamily="system-ui,sans-serif" className="pointer-events-none">
              {p.role}
            </text>
          </g>
        );
      })}

      {/* Defense coverage handles on top */}
      {players
        .filter((p) => p.side === "defense" && p.coverage === "zone")
        .map((p) => {
          const zx = xSvg(p.x);
          const zy = ySvg(p.y);
          const rx = ((p.defZoneRx ?? 6) / TOTAL_LENGTH_YARDS) * w;
          const ry = ((p.defZoneRy ?? 4) / FIELD_H_YARDS) * h;
          return (
            <g key={`dzh-${p.id}`}>
              <circle
                cx={zx + rx}
                cy={zy}
                r={8}
                fill="white"
                stroke={DEF_ZONE_STROKE}
                strokeWidth={2}
                className="cursor-ew-resize"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDefResizeDrag({ playerId: p.id, kind: "zone-rx", cx: p.x, cy: p.y });
                }}
              />
              <circle
                cx={zx}
                cy={zy + ry}
                r={8}
                fill="white"
                stroke={DEF_ZONE_STROKE}
                strokeWidth={2}
                className="cursor-ns-resize"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDefResizeDrag({ playerId: p.id, kind: "zone-ry", cx: p.x, cy: p.y });
                }}
              />
            </g>
          );
        })}

      {players
        .filter((p) => p.side === "defense" && p.coverage === "man")
        .map((p) => {
          const zx = xSvg(p.x);
          const zy = ySvg(p.y);
          const mr = ((p.manRadiusYards ?? 4) / TOTAL_LENGTH_YARDS) * w;
          return (
            <circle
              key={`dmh-${p.id}`}
              cx={zx + mr}
              cy={zy}
              r={8}
              fill="white"
              stroke={MAN_YELLOW_STROKE}
              strokeWidth={2}
              className="cursor-ew-resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDefResizeDrag({ playerId: p.id, kind: "man-r", cx: p.x, cy: p.y });
              }}
            />
          );
        })}
    </svg>
  );
}

function normalizeSkillPlayer(p: FieldPlayer): FieldPlayer {
  if (p.side !== "offense" || !isSkillRole(p.role)) return p;
  const rk = p.routeKind ?? "pass";
  let wps = p.routeWaypoints;
  if (!wps?.length) {
    wps = [
      [p.x + 6, p.y],
      [p.x + 18, p.y - 4],
    ];
  }
  return { ...p, routeKind: rk, routeWaypoints: wps };
}

function normalizeDefender(p: FieldPlayer): FieldPlayer {
  if (p.side !== "defense") return p;
  const cov = p.coverage ?? "zone";
  return {
    ...p,
    coverage: cov,
    defZoneRx: p.defZoneRx ?? 6,
    defZoneRy: p.defZoneRy ?? 4,
    manRadiusYards: p.manRadiusYards ?? 4,
  };
}

function defaultPlayers(): FieldPlayer[] {
  const bx = ENDZONE_YARDS + 25;
  const dx = ENDZONE_YARDS + 55;
  const o: FieldPlayer[] = [
    { id: "o-qb", role: "QB", side: "offense", x: bx, y: 26.65 },
    normalizeSkillPlayer({
      id: "o-wr1",
      role: "WR",
      side: "offense",
      x: bx + 4,
      y: 10,
      routeKind: "pass",
      routeWaypoints: [
        [bx + 14, 10],
        [bx + 32, 8],
      ],
    }),
    normalizeSkillPlayer({
      id: "o-te",
      role: "TE",
      side: "offense",
      x: bx + 3,
      y: 38,
      routeKind: "block",
      routeWaypoints: [
        [bx + 8, 36],
        [bx + 12, 34],
      ],
    }),
    normalizeSkillPlayer({
      id: "o-rb",
      role: "RB",
      side: "offense",
      x: bx - 6,
      y: 28,
      routeKind: "run",
      routeWaypoints: [
        [bx + 2, 30],
        [bx + 20, 22],
      ],
    }),
    normalizeSkillPlayer({
      id: "o-wr2",
      role: "WR",
      side: "offense",
      x: bx + 2,
      y: 18,
      routeKind: "pass",
      routeWaypoints: [
        [bx + 10, 22],
        [bx + 24, 26],
      ],
    }),
    normalizeSkillPlayer({
      id: "o-wr3",
      role: "WR",
      side: "offense",
      x: bx + 5,
      y: 44,
      routeKind: "run",
      routeWaypoints: [
        [bx + 12, 40],
        [bx + 28, 36],
      ],
    }),
  ];
  const d: FieldPlayer[] = [
    normalizeDefender({ id: "d-1", role: "CB", side: "defense", x: dx, y: 12, coverage: "man" }),
    normalizeDefender({ id: "d-2", role: "CB", side: "defense", x: dx - 4, y: 44, coverage: "zone" }),
    normalizeDefender({ id: "d-3", role: "LB", side: "defense", x: dx - 8, y: 26.65, coverage: "blitz" }),
    normalizeDefender({ id: "d-4", role: "LB", side: "defense", x: dx - 12, y: 32, coverage: "zone" }),
    normalizeDefender({ id: "d-5", role: "S", side: "defense", x: dx + 10, y: 20, coverage: "blitz" }),
    normalizeDefender({ id: "d-6", role: "S", side: "defense", x: dx + 8, y: 34, coverage: "man" }),
  ];
  return [...o, ...d];
}

const SKILL_OPTIONS: PlayerRole[] = ["WR", "TE", "RB"];
const DEF_ROLE_OPTIONS: PlayerRole[] = ["CB", "LB", "S"];

export default function Playbook() {
  const [players, setPlayers] = useState<FieldPlayer[]>(defaultPlayers);
  const [lineOfScrimmageX, setLineOfScrimmageX] = useState(ENDZONE_YARDS + 30);
  const [firstDownX, setFirstDownX] = useState(ENDZONE_YARDS + 34);

  const offense = players.filter((p) => p.side === "offense");
  const defense = players.filter((p) => p.side === "defense");

  const onPlayerMove = (playerId: string, x: number, y: number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        const dx = x - p.x;
        const dy = y - p.y;
        const next = { ...p, x, y };
        if (p.side === "offense" && isSkillRole(p.role) && p.routeWaypoints) {
          next.routeWaypoints = p.routeWaypoints.map(([wx, wy]) => [wx + dx, wy + dy] as [number, number]);
        }
        return next;
      }),
    );
  };

  const onSkillRouteWaypoints = (playerId: string, waypoints: [number, number][]) => {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, routeWaypoints: waypoints } : p)));
  };

  const onSkillRouteWholeFromInitial = (
    playerId: string,
    dx: number,
    dy: number,
    initial: { x: number; y: number; waypoints: [number, number][] },
  ) => {
    const clampX = (v: number) => Math.max(0, Math.min(TOTAL_LENGTH_YARDS, v));
    const clampY = (v: number) => Math.max(0, Math.min(FIELD_H_YARDS, v));
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        const nx = clampX(initial.x + dx);
        const ny = clampY(initial.y + dy);
        const ax = nx - (initial.x + dx);
        const ay = ny - (initial.y + dy);
        return {
          ...p,
          x: nx,
          y: ny,
          routeWaypoints: initial.waypoints.map(([wx, wy]) =>
            [clampX(wx + dx + ax), clampY(wy + dy + ay)] as [number, number],
          ),
        };
      }),
    );
  };

  const onDefCoveragePatch = (
    playerId: string,
    patch: Partial<Pick<FieldPlayer, "defZoneRx" | "defZoneRy" | "manRadiusYards">>,
  ) => {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, ...patch } : p)));
  };

  const onMarkerX = (which: "los" | "fd", x: number) => {
    if (which === "los") setLineOfScrimmageX(x);
    else setFirstDownX(x);
  };

  const setOffenseRole = (index: number, role: PlayerRole) => {
    if (index === 0) return;
    setPlayers((prev) => {
      const o = prev.filter((p) => p.side === "offense");
      const d = prev.filter((p) => p.side === "defense");
      const target = o[index];
      if (!target || !isSkillRole(role)) return prev;
      const norm = normalizeSkillPlayer({ ...target, role });
      const oo = o.map((p, i) => (i === index ? norm : p));
      return [...oo, ...d];
    });
  };

  const setDefenseRole = (index: number, role: PlayerRole) => {
    setPlayers((prev) => {
      const o = prev.filter((p) => p.side === "offense");
      const d = prev.filter((p) => p.side === "defense");
      const target = d[index];
      if (!target || !DEF_ROLE_OPTIONS.includes(role)) return prev;
      const updated = normalizeDefender({ ...target, role });
      const dd = d.map((p, i) => (i === index ? updated : p));
      return [...o, ...dd];
    });
  };

  const setDefenseCoverage = (index: number, cov: DefensiveCoverageKind) => {
    setPlayers((prev) => {
      const o = prev.filter((p) => p.side === "offense");
      const d = prev.filter((p) => p.side === "defense");
      const target = d[index];
      if (!target) return prev;
      const updated = normalizeDefender({ ...target, coverage: cov });
      const dd = d.map((p, i) => (i === index ? updated : p));
      return [...o, ...dd];
    });
  };

  const setSkillRouteKind = (playerId: string, kind: OffenseRouteKind) => {
    setPlayers((prev) => prev.map((p) => (p.id === playerId && isSkillRole(p.role) ? { ...p, routeKind: kind } : p)));
  };

  const addRouteBend = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId || !p.routeWaypoints?.length) return p;
        const last = p.routeWaypoints[p.routeWaypoints.length - 1]!;
        const prevPt =
          p.routeWaypoints.length >= 2 ? p.routeWaypoints[p.routeWaypoints.length - 2]! : ([p.x, p.y] as [number, number]);
        const mx = (prevPt[0] + last[0]) / 2;
        const my = (prevPt[1] + last[1]) / 2;
        const nextWps = [...p.routeWaypoints.slice(0, -1), [mx, my] as [number, number], last];
        return { ...p, routeWaypoints: nextWps };
      }),
    );
  };

  const resetPlay = () => {
    setPlayers(defaultPlayers());
    setLineOfScrimmageX(ENDZONE_YARDS + 30);
    setFirstDownX(ENDZONE_YARDS + 34);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Playbook</div>
        <p className="mt-1 text-sm text-gray-600">
          Six on offense (1 QB + 5 skill), six on defense. Each skill player has a run (red), pass (yellow), or block (grey) route
          with bendable points. Defenders use zone (blue), man (yellow), or blitz (red arrow to QB). Drag the black line of
          scrimmage and orange first-down marker; distance to gain stays positive.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <FootballField
              players={players}
              lineOfScrimmageX={lineOfScrimmageX}
              firstDownX={firstDownX}
              onPlayerMove={onPlayerMove}
              onSkillRouteWaypoints={onSkillRouteWaypoints}
              onSkillRouteWholeFromInitial={onSkillRouteWholeFromInitial}
              onDefCoveragePatch={onDefCoveragePatch}
              onMarkerX={onMarkerX}
            />
          </Card>
        </div>

        <Card className="max-h-[80vh] space-y-3 overflow-y-auto">
          <div className="text-sm font-semibold">Offense ({OFFENSE_COUNT})</div>
          <p className="text-xs text-gray-500">Slot 1 is always QB. Slots 2–6 are skill (WR / TE / RB).</p>
          {offense.map((p, i) => (
            <div key={p.id} className="space-y-1 rounded-md border border-gray-100 p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-14 font-medium text-gray-600">{i === 0 ? "QB" : `Skill ${i}`}</span>
                {i === 0 ? (
                  <span className="text-gray-800">QB (fixed)</span>
                ) : (
                  <select
                    className="flex-1 rounded border border-gray-200 bg-white px-1 py-0.5"
                    value={p.role}
                    onChange={(e) => setOffenseRole(i, e.target.value as PlayerRole)}
                  >
                    {SKILL_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {i > 0 && isSkillRole(p.role) && (
                <>
                  <label className="flex items-center gap-2 text-gray-600">
                    Route
                    <select
                      className="flex-1 rounded border border-gray-200 bg-white px-1 py-0.5"
                      value={p.routeKind ?? "pass"}
                      onChange={(e) => setSkillRouteKind(p.id, e.target.value as OffenseRouteKind)}
                    >
                      <option value="pass">Pass (yellow)</option>
                      <option value="run">Run (red)</option>
                      <option value="block">Block (grey)</option>
                    </select>
                  </label>
                  <Button variant="ghost" className="!h-7 !min-h-0 !px-2 !py-0 text-xs" onClick={() => addRouteBend(p.id)}>
                    Add bend
                  </Button>
                </>
              )}
            </div>
          ))}

          <div className="border-t border-gray-100 pt-2 text-sm font-semibold">Defense ({DEFENSE_COUNT})</div>
          {defense.map((p, i) => (
            <div key={p.id} className="flex flex-col gap-1 rounded-md border border-gray-100 p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-10 text-gray-600">#{i + 1}</span>
                <select
                  className="flex-1 rounded border border-gray-200 bg-white px-1 py-0.5"
                  value={p.role}
                  onChange={(e) => setDefenseRole(i, e.target.value as PlayerRole)}
                >
                  {DEF_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-gray-600">
                Coverage
                <select
                  className="flex-1 rounded border border-gray-200 bg-white px-1 py-0.5"
                  value={p.coverage ?? "zone"}
                  onChange={(e) => setDefenseCoverage(i, e.target.value as DefensiveCoverageKind)}
                >
                  <option value="zone">Zone (blue)</option>
                  <option value="man">Man (yellow)</option>
                  <option value="blitz">Blitz → QB</option>
                </select>
              </label>
            </div>
          ))}

          <Button variant="ghost" onClick={resetPlay}>
            Reset field
          </Button>
        </Card>
      </div>
    </div>
  );
}
