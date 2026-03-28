import { Card } from "../ui/primitives/Card";
import { useEffect, useState } from "react";

export default function Settings() {
  const [useMocks, setUseMocks] = useState(() => localStorage.getItem("gridiq_use_mocks") === "true");
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("gridiq_api_base") || "");

  useEffect(() => {
    localStorage.setItem("gridiq_use_mocks", useMocks ? "true" : "false");
  }, [useMocks]);

  useEffect(() => {
    void import("../lib/api/client").then((mod) => mod.setApiBaseUrl(apiBase));
  }, [apiBase]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="mt-1 text-sm text-gray-600">
          Role gates, profile, preferences, model/provider config, etc.
        </div>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useMocks}
              onChange={(e) => setUseMocks(e.target.checked)}
            />
            <span className="text-sm">Use local mocks (no backend)</span>
          </label>
          <div className="text-sm text-gray-600">Toggle to run the UI without requiring a server.</div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">API base URL</label>
          <input
            className="w-full rounded border-gray-300 p-2"
            value={apiBase}
            placeholder="http://localhost:8000"
            onChange={(e) => setApiBase(e.target.value)}
          />
          <div className="text-xs text-gray-500">
            Override the base URL that the frontend hits (persists to localStorage).
          </div>
        </div>
      </Card>
    </div>
  );
}
