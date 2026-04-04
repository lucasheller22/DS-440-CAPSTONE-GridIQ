import { Card } from "../ui/primitives/Card";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "../lib/api/endpoints";

const SEASON_CHOICES = [2024, 2023, 2022, 2021, 2020, 2019];

export default function Dashboard() {
  const [season, setSeason] = useState(2024);
  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const {
    data: scheduleGames = [],
    isLoading: loadingSchedule,
    isError: scheduleError,
    error: scheduleErr,
  } = useQuery({
    queryKey: ["nflverse-schedule", season, weekFilter],
    queryFn: () =>
      api.fetchNflverseSchedule(season, {
        week: weekFilter === "" ? undefined : weekFilter,
        gameType: "REG",
      }),
  });

  const {
    data: plays = [],
    isLoading: loadingPlays,
    isError: playsError,
    error: playsErr,
  } = useQuery({
    queryKey: ["nflverse-plays", selectedGameId],
    queryFn: () => (selectedGameId ? api.fetchNflverseGamePlays(selectedGameId) : Promise.resolve([])),
    enabled: !!selectedGameId,
  });

  const gamesByWeek = useMemo(() => {
    const map = new Map<number, typeof scheduleGames>();
    for (const g of scheduleGames) {
      const w = g.week;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(g);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [scheduleGames]);

  const playsPerWeek = useMemo(() => {
    const counts = new Map<number, number>();
    for (const g of scheduleGames) {
      counts.set(g.week, (counts.get(g.week) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [scheduleGames]);

  const maxWeekCount = useMemo(
    () => playsPerWeek.reduce((m, [, c]) => Math.max(m, c), 0),
    [playsPerWeek],
  );

  const selectedGame = useMemo(
    () => scheduleGames.find((g) => g.gameId === selectedGameId) ?? null,
    [scheduleGames, selectedGameId],
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Dashboard</div>
        <p className="mt-1 text-sm text-gray-600">
          NFL schedule and play-by-play from the open{" "}
          <a
            className="text-blue-600 underline"
            href="https://github.com/nflverse"
            target="_blank"
            rel="noreferrer"
          >
            nflverse
          </a>{" "}
          dataset (via{" "}
          <a
            className="text-blue-600 underline"
            href="https://github.com/nflverse/nfl_data_py"
            target="_blank"
            rel="noreferrer"
          >
            nfl_data_py
          </a>
          ). Licensed CC-BY-4.0.
        </p>
      </div>

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="dash-season">
              Season
            </label>
            <select
              id="dash-season"
              className="rounded border border-gray-300 p-2"
              value={season}
              onChange={(e) => {
                setSeason(Number(e.target.value));
                setSelectedGameId(null);
              }}
            >
              {SEASON_CHOICES.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="dash-week">
              Week filter
            </label>
            <select
              id="dash-week"
              className="rounded border border-gray-300 p-2"
              value={weekFilter === "" ? "" : String(weekFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setWeekFilter(v === "" ? "" : Number(v));
                setSelectedGameId(null);
              }}
            >
              <option value="">All weeks</option>
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="dash-game">
            Game
          </label>
          <select
            id="dash-game"
            className="rounded border border-gray-300 p-2"
            value={selectedGameId ?? ""}
            onChange={(e) => setSelectedGameId(e.target.value || null)}
          >
            <option value="">— Select a game —</option>
            {gamesByWeek.map(([wk, games]) => (
              <optgroup key={wk} label={`Week ${wk}`}>
                {games.map((g) => (
                  <option key={g.gameId} value={g.gameId}>
                    {g.awayTeam} @ {g.homeTeam}
                    {g.gameday ? ` · ${g.gameday}` : ""}
                    {g.awayScore != null && g.homeScore != null
                      ? ` (${g.awayScore}–${g.homeScore})`
                      : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {loadingSchedule && <div className="text-xs text-gray-500">Loading schedule…</div>}
          {scheduleError && (
            <div className="text-xs text-red-600">
              {scheduleErr instanceof Error ? scheduleErr.message : "Could not load schedule."}
            </div>
          )}
        </div>
      </Card>

      {selectedGameId && (
        <Card>
          <div className="text-sm font-semibold">Plays (nflverse PBP)</div>
          {selectedGame && (
            <div className="mt-1 text-xs text-gray-500">
              {selectedGame.awayTeam} @ {selectedGame.homeTeam}
              {selectedGame.stadium ? ` · ${selectedGame.stadium}` : ""}
            </div>
          )}
          {loadingPlays ? (
            <div className="mt-2 text-xs text-gray-500">
              Loading play-by-play (first load for a season can take a bit while data caches)…
            </div>
          ) : playsError ? (
            <div className="mt-2 text-xs text-red-600">
              {playsErr instanceof Error ? playsErr.message : "Could not load plays."}
            </div>
          ) : plays.length === 0 ? (
            <div className="mt-2 text-sm text-gray-600">No plays returned.</div>
          ) : (
            <ul className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {plays.map((p) => (
                <li key={p.id} className="rounded border border-gray-200 p-2">
                  <div className="text-sm font-medium">
                    Q{p.quarter ?? "—"} ·{" "}
                    {p.down != null && p.yardsToGo != null
                      ? `${p.down} & ${p.yardsToGo}`
                      : "—"}
                    {p.playType ? ` · ${p.playType}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.offense ?? "—"} vs {p.defense ?? "—"}
                    {p.epa != null && ` · EPA ${p.epa.toFixed(3)}`}
                    {p.yardsGained != null && ` · ${p.yardsGained} yds`}
                  </div>
                  {p.description && <div className="mt-1 text-xs text-gray-700">{p.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Insights</div>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-800">{scheduleGames.length}</span> regular-season
              games loaded for {season}
              {weekFilter !== "" ? ` (week ${weekFilter} only)` : ""}.
            </div>
            {selectedGame && (
              <div>
                Selected:{" "}
                <span className="font-medium text-gray-800">
                  {selectedGame.awayTeam} @ {selectedGame.homeTeam}
                </span>
                , week {selectedGame.week}.
              </div>
            )}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Games per week</div>
          <div className="mt-3 flex h-28 items-end gap-1">
            {playsPerWeek.map(([w, count]) => (
              <div key={w} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-500/80"
                  style={{
                    height: `${maxWeekCount ? Math.max(6, (count / maxWeekCount) * 88) : 6}px`,
                  }}
                  title={`Week ${w}: ${count} games`}
                />
                <span className="text-[10px] text-gray-500">{w}</span>
              </div>
            ))}
          </div>
          {playsPerWeek.length === 0 && !loadingSchedule && (
            <div className="mt-2 text-sm text-gray-600">No data for this filter.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
