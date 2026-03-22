import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../stores/auth";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import { Card } from "../ui/primitives/Card";

export default function Login() {
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("test@gridiq.dev");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    try {
      // For testing: accept any email/password combination
      if (isRegister) {
        await register(email, password);
      } else {
        // Try login first, if fails, register automatically
        try {
          await login(email, password);
        } catch {
          await register(email, password);
        }
      }
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? `${isRegister ? "Registration" : "Login"} failed`);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="mt-10">
        <div className="text-xl font-semibold">Quick Access</div>
        <div className="mt-1 text-sm text-gray-600">Enter any email and password to continue.</div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-700">Email (any)</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-700">Password (any)</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <Button
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? "Processing…" : "Continue"}
          </Button>

          <div className="text-center text-sm text-gray-500">
            Auto-registers if account doesn't exist
          </div>
        </div>
      </Card>
    </div>
  );
}
