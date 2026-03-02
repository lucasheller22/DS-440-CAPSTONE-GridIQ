import { Card } from "../ui/primitives/Card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "../lib/api/endpoints";

export default function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: games = [], isLoading: loadingGames } = useQuery({
    queryKey: ["games"],
    queryFn: api.listGames,
  });

  const { data: plays = [], isLoading: loadingPlays } = useQuery({
    queryKey: ["plays", selected],
    queryFn: () => (selected ? api.listPlays(selected) : Promise.resolve([])),
    enabled: !!selected,
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Dashboard</div>
        <div className="mt-1 text-sm text-gray-600">
          Team/game overview, filters, and insight cards live here.
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Choose game</label>
          <select
            className="rounded border-gray-300 p-2"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
          >
            <option value="">-- select --</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.awayTeam} @ {g.homeTeam} (wk {g.week})
              </option>
            ))}
          </select>
          {loadingGames && <div className="text-xs text-gray-500">loading…</div>}
        </div>
      </Card>

      {selected && (
        <Card>
          <div className="text-sm font-semibold">Plays for selected game</div>
          {loadingPlays ? (
            <div className="text-xs text-gray-500">loading plays…</div>
          ) : plays.length === 0 ? (
            <div className="text-sm text-gray-600">no plays available yet</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {plays.map((p) => (
                <li key={p.id} className="rounded border p-2">
                  <div className="text-sm font-medium">
                    {p.down} &amp; {p.yardsToGo}, {p.playType}
                  </div>
                  <div className="text-xs text-gray-500">{p.description}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold">Insights</div>
          <div className="mt-1 text-sm text-gray-600">
            Create cards like “Explosive plays allowed”, “3rd down success”, etc.
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Charts</div>
          <div className="mt-1 text-sm text-gray-600">
            Add play-type breakdowns; later you can plug in Recharts if you want.
          </div>
        </Card>
      </div>
    </div>
  );
}
