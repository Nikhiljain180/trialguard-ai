"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Phone,
  Pill,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";

interface Stats {
  totalPatients: number;
  activePatients: number;
  totalCalls: number;
  completedCalls: number;
  activeAlerts: number;
  adherenceRate: number;
  riskDistribution: { low: number; medium: number; high: number };
  recentCalls: Array<{
    id: string;
    outcome: string | null;
    trialDay: number;
    duration: number | null;
    calledAt: string | null;
    patient: { name: string };
  }>;
}

const RISK_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

function outcomeColor(outcome: string | null) {
  switch (outcome) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "adverse_event":
      return "bg-red-100 text-red-800";
    case "dropout_risk":
      return "bg-amber-100 text-amber-800";
    case "no_answer":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function outcomeLabel(outcome: string | null) {
  switch (outcome) {
    case "completed":
      return "Completed";
    case "adverse_event":
      return "Adverse Event";
    case "dropout_risk":
      return "Dropout Risk";
    case "no_answer":
      return "No Answer";
    case "in_progress":
      return "In Progress";
    default:
      return outcome || "Pending";
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const riskData = [
    { name: "Low Risk", value: stats.riskDistribution.low, color: RISK_COLORS.low },
    { name: "Medium Risk", value: stats.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: "High Risk", value: stats.riskDistribution.high, color: RISK_COLORS.high },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trial Dashboard</h1>
        <p className="text-sm text-slate-500">
          PCT-2024-0847 &middot; Phase III Metformin XR 500mg &middot; 90-day
          enrollment
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Patients
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activePatients}</div>
            <p className="text-xs text-slate-500">
              of {stats.totalPatients} enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Calls
            </CardTitle>
            <Phone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedCalls}</div>
            <p className="text-xs text-slate-500">
              {stats.totalCalls} total initiated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Adherence Rate
            </CardTitle>
            <Pill className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.adherenceRate}%</span>
              {stats.adherenceRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-slate-500">medication compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.activeAlerts}
            </div>
            <p className="text-xs text-slate-500">require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dropout Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {riskData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name}: {d.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Call Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">
                        {call.patient.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Day {call.trialDay}
                        {call.duration && ` · ${Math.round(call.duration / 60)}min`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={outcomeColor(call.outcome)}
                    >
                      {outcomeLabel(call.outcome)}
                    </Badge>
                    {call.calledAt && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(call.calledAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {stats.recentCalls.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">
                  No calls recorded yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
