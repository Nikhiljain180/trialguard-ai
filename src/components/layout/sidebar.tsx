"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  Phone,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/alerts?resolved=false")
      .then((r) => r.json())
      .then((data) => setAlertCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/alerts?resolved=false")
        .then((r) => r.json())
        .then((data) => setAlertCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Activity className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">TrialGuard</h1>
          <p className="text-[10px] leading-none text-slate-500">
            Clinical Trial AI
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.name === "Alerts" && alertCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]"
                >
                  {alertCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t p-4">
        <div className="rounded-lg bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
            <Phone className="h-3.5 w-3.5" />
            Trial PCT-2024-0847
          </div>
          <p className="mt-1 text-[10px] text-blue-600">
            Phase III &middot; Metformin XR 500mg
          </p>
          <p className="text-[10px] text-blue-600">90-day enrollment</p>
        </div>
      </div>
    </aside>
  );
}
