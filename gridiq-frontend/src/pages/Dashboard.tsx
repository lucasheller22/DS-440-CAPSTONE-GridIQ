import { Card } from "../ui/primitives/Card";

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Dashboard</div>
        <div className="mt-1 text-sm text-gray-600">
          Team/game overview, filters, and insight cards live here.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold">Next feature</div>
          <div className="mt-1 text-sm text-gray-600">
            Wire to <code>GET /games</code> and populate schedule + selection state.
          </div>
        </Card>
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
