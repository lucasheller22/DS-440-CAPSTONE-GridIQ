import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, PlayCircle, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/playbook", label: "Playbook", icon: PlayCircle },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <div className="sticky top-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-lg font-semibold">GridIQ</div>
      <div className="mt-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                isActive ? "bg-gray-100" : "hover:bg-gray-50"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        Starter framework: routing, auth gate, chat skeleton, play visualizer placeholder.
      </div>
    </div>
  );
}
