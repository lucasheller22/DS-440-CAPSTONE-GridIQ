import { useNavigate } from "react-router-dom";
import { useAuth } from "../../stores/auth";
import { Button } from "../primitives/Button";

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
      <div className="text-sm text-gray-600">
        {user ? (
          <>
            Signed in as <span className="font-medium text-gray-900">{user.displayName}</span> ({user.role})
          </>
        ) : (
          "Not signed in"
        )}
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </Button>
        )}
      </div>
    </div>
  );
}
