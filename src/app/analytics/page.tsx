"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Phone,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";

interface PatientData {
  id: string;
  name: string;
  trialDay: number;
  status: string;
  calls: Array<{
    trialDay: number;
    morningDose: boolean | null;
    eveningDose: boolean | null;
    nausea: string | null;
    headache: string | null;
    status: string;
  }>;
}

export default function AnalyticsPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        const ids = data.map((p: PatientData) => p.id);
        return Promise.all(
          ids.map((id: string) =>
            fetch(`/api/patients/${id}`).then((r) => r.json())
          )
        );
      })
      .then(setPatients)
      .catch(console.error);
  }, []);

  if (patients.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-slate-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  // Retention curve: for each trial day bucket, how many patients are still active
  const maxDay = Math.max(...patients.map((p) => p.trialDay));
  const retentionData = [];
  for (let day = 1; day <= maxDay; day += 5) {
    const active = patients.filter((p) => p.trialDay >= day && p.status !== "withdrawn").length;
    retentionData.push({
      day,
      patients: active,
      rate: Math.round((active / patients.length) * 100),
    });
  }

  // Adherence trend by trial day buckets
  const allCalls = patients.flatMap((p) =>
    (p.calls || [])
      .filter((c) => c.status === "completed")
      .map((c) => ({ ...c }))
  );
  const dayBuckets: Record<number, { taken: number; total: number }> = {};
  for (const c of allCalls) {
    const bucket = Math.floor(c.trialDay / 7) * 7 + 1;
    if (!dayBuckets[bucket]) dayBuckets[bucket] = { taken: 0, total: 0 };
    dayBuckets[bucket].total += 2;
    dayBuckets[bucket].taken += (c.morningDose ? 1 : 0) + (c.eveningDose ? 1 : 0);
  }
  const adherenceData = Object.entries(dayBuckets)
    .map(([day, { taken, total }]) => ({
      week: `Day ${day}`,
      rate: total > 0 ? Math.round((taken / total) * 100) : 0,
    }))
    .sort((a, b) => parseInt(a.week.replace("Day ", "")) - parseInt(b.week.replace("Day ", "")));

  // Symptom frequency
  const symptomCounts = { nausea: 0, headache: 0, fatigue: 0, other: 0 };
  for (const c of allCalls) {
    if (c.nausea && c.nausea !== "none") symptomCounts.nausea++;
    if (c.headache && c.headache !== "none") symptomCounts.headache++;
  }
  const symptomData = [
    { symptom: "Nausea", count: symptomCounts.nausea },
    { symptom: "Headache", count: symptomCounts.headache },
  ];

  const totalAICalls = allCalls.length;
  const aiCost = (totalAICalls * 0.15).toFixed(2);
  const humanCost = (totalAICalls * 65).toFixed(0);
  const savings = (totalAICalls * 64.85).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">
          Trial performance metrics and cost analysis
        </p>
      </div>

      {/* Cost Comparison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                AI Voice Calls
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-700">
              ${aiCost}
            </p>
            <p className="text-xs text-green-600">
              {totalAICalls} calls x $0.15/call
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Manual Calls (Would Cost)
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-700">
              ${humanCost}
            </p>
            <p className="text-xs text-red-600">
              {totalAICalls} calls x $65/call
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Cost Savings
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              ${savings}
            </p>
            <p className="text-xs text-blue-600">
              99.8% cost reduction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retention Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Patient Retention Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  label={{ value: "Trial Day", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  label={{
                    value: "Active Patients",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ReTooltip />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Adherence Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Medication Adherence by Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <ReTooltip />
                  <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Adherence %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Symptom Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Symptom Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptomData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="symptom" type="category" width={80} />
                  <ReTooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Trial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Avg Call Duration
              </p>
              <p className="mt-1 text-lg font-semibold">
                {allCalls.length > 0
                  ? `${Math.round(
                      allCalls.reduce(
                        (a, c) => a + ((c as unknown as { duration?: number }).duration || 0),
                        0
                      ) /
                        allCalls.length /
                        60
                    )} min`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Data Completeness
              </p>
              <p className="mt-1 text-lg font-semibold">
                {allCalls.length > 0
                  ? `${Math.round(
                      (allCalls.filter((c) => c.nausea).length / allCalls.length) * 100
                    )}%`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Detection Speed
              </p>
              <p className="mt-1 text-lg font-semibold">Same Day</p>
              <p className="text-xs text-slate-400">vs. weeks at next visit</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Trial Delay Cost Saved
              </p>
              <p className="mt-1 text-lg font-semibold text-green-600">
                $4.2M
              </p>
              <p className="text-xs text-slate-400">est. per avoided delay day</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
