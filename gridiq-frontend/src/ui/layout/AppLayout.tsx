import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../stores/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const { hydrate } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // If not logged in, allow /login; otherwise keep user in app
  useEffect(() => {
    const token = localStorage.getItem("gridiq_token");
    if (!token && location.pathname !== "/login") navigate("/login", { replace: true });
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <Sidebar />
        </aside>
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Topbar />
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
