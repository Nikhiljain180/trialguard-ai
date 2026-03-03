"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Pill,
  PhoneOff,
  User,
} from "lucide-react";

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    trialDay: number;
  };
}

function typeIcon(type: string) {
  switch (type) {
    case "adverse_event":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "dropout_risk":
      return <TrendingDown className="h-4 w-4 text-amber-500" />;
    case "missed_dose":
      return <Pill className="h-4 w-4 text-orange-500" />;
    case "no_answer":
      return <PhoneOff className="h-4 w-4 text-slate-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-slate-500" />;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50";
    case "high":
      return "border-orange-200 bg-orange-50";
    case "medium":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-slate-200 bg-slate-50";
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge className="bg-red-600 text-white hover:bg-red-600">Critical</Badge>;
    case "high":
      return <Badge className="bg-orange-500 text-white hover:bg-orange-500">High</Badge>;
    case "medium":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Medium</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  const loadAlerts = useCallback(() => {
    const params =
      filter === "active"
        ? "?resolved=false"
        : filter === "resolved"
        ? "?resolved=true"
        : "";
    fetch(`/api/alerts${params}`)
      .then((r) => r.json())
      .then(setAlerts)
      .catch(console.error);
  }, [filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const resolveAlert = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    loadAlerts();
  };

  const grouped = {
    critical: alerts.filter((a) => a.severity === "critical" && !a.resolved),
    high: alerts.filter((a) => a.severity === "high" && !a.resolved),
    medium: alerts.filter((a) => a.severity === "medium" && !a.resolved),
    resolved: alerts.filter((a) => a.resolved),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-sm text-slate-500">
          {alerts.filter((a) => !a.resolved).length} unresolved alerts
        </p>
      </div>

      <div className="flex gap-2">
        {(["active", "all", "resolved"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Critical */}
      {grouped.critical.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
            Critical ({grouped.critical.length})
          </h2>
          {grouped.critical.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />
          ))}
        </div>
      )}

      {/* High */}
      {grouped.high.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
            High ({grouped.high.length})
          </h2>
          {grouped.high.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />
          ))}
        </div>
      )}

      {/* Medium */}
      {grouped.medium.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
            Medium ({grouped.medium.length})
          </h2>
          {grouped.medium.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />
          ))}
        </div>
      )}

      {/* Resolved */}
      {grouped.resolved.length > 0 && filter !== "active" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Resolved ({grouped.resolved.length})
          </h2>
          {grouped.resolved.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={resolveAlert}
            />
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-400" />
            <p className="mt-2 text-sm text-slate-500">No alerts to display</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onResolve,
}: {
  alert: Alert;
  onResolve: (id: string) => void;
}) {
  return (
    <Card className={`${severityColor(alert.severity)} ${alert.resolved ? "opacity-60" : ""}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {typeIcon(alert.type)}
            <div>
              <div className="flex items-center gap-2">
                {severityBadge(alert.severity)}
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {alert.type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-800">{alert.message}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <Link
                  href={`/patients/${alert.patient.id}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <User className="h-3 w-3" />
                  {alert.patient.name}
                </Link>
                <span>Day {alert.patient.trialDay}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          {!alert.resolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Resolve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
