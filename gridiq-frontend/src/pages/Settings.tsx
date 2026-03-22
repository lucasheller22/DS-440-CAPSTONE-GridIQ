import { Card } from "../ui/primitives/Card";

export default function Settings() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="mt-1 text-sm text-gray-600">
          Role gates, profile, preferences, model/provider config, etc.
        </div>
      </div>
      <Card>
        <div className="text-sm text-gray-700">
          TODO: add toggles for “streaming responses”, “show citations”, and a backend base URL override.
        </div>
      </Card>
    </div>
  );
}
