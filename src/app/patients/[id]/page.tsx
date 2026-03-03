"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Loader2,
  Calendar,
  Pill,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PhoneCall,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";

interface Call {
  id: string;
  trialDay: number;
  status: string;
  nausea: string | null;
  headache: string | null;
  energyLevel: string | null;
  otherSymptoms: string | null;
  morningDose: boolean | null;
  eveningDose: boolean | null;
  adverseEvent: string | null;
  adverseSeverity: number | null;
  motivation: number | null;
  transcript: string | null;
  duration: number | null;
  outcome: string | null;
  calledAt: string | null;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  trialArm: string;
  trialDay: number;
  enrollmentDate: string;
  status: string;
  dropoutRisk: string;
  calls: Call[];
  alerts: Alert[];
}

const severityToNum: Record<string, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};
const energyToNum: Record<string, number> = { low: 1, moderate: 2, high: 3 };

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [calling, setCalling] = useState(false);
  const [callMsg, setCallMsg] = useState<string | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then(setPatient)
      .catch(console.error);
  }, [id]);

  const triggerCall = async () => {
    setCalling(true);
    setCallMsg(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id }),
      });
      const data = await res.json();
      setCallMsg(data.message || data.error);
      const updated = await fetch(`/api/patients/${id}`).then((r) => r.json());
      setPatient(updated);
    } catch {
      setCallMsg("Failed to initiate call");
    } finally {
      setCalling(false);
      setTimeout(() => setCallMsg(null), 5000);
    }
  };

  if (!patient) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-slate-400 text-sm">Loading patient data...</div>
      </div>
    );
  }

  const completedCalls = patient.calls.filter((c) => c.status === "completed");
  const chartData = completedCalls.map((c) => ({
    day: c.trialDay,
    nausea: severityToNum[c.nausea || "none"],
    headache: severityToNum[c.headache || "none"],
    energy: energyToNum[c.energyLevel || "moderate"],
    motivation: c.motivation || 0,
  }));

  const adherenceData = completedCalls.map((c) => ({
    day: c.trialDay,
    morning: c.morningDose,
    evening: c.eveningDose,
  }));

  const totalDoses = completedCalls.length * 2;
  const takenDoses = completedCalls.reduce(
    (a, c) => a + (c.morningDose ? 1 : 0) + (c.eveningDose ? 1 : 0),
    0
  );
  const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Patient Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            <span>{patient.phone}</span>
            <span>&middot;</span>
            <span className="capitalize">{patient.trialArm} arm</span>
            <span>&middot;</span>
            <span>
              Day {patient.trialDay} of 90
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge
              className={
                patient.dropoutRisk === "high"
                  ? "bg-red-100 text-red-800"
                  : patient.dropoutRisk === "medium"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {patient.dropoutRisk} risk
            </Badge>
            <Badge
              className={
                patient.status === "flagged"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }
            >
              {patient.status}
            </Badge>
          </div>
        </div>
        <Button onClick={triggerCall} disabled={calling}>
          {calling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Phone className="mr-2 h-4 w-4" />
          )}
          Call Now
        </Button>
      </div>

      {callMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <PhoneCall className="mr-2 inline h-4 w-4" />
          {callMsg}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-slate-500">Enrolled</span>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {new Date(patient.enrollmentDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500" />
              <span className="text-sm text-slate-500">Total Calls</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{patient.calls.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-slate-500">Adherence</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{adherenceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-slate-500">Active Alerts</span>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {patient.alerts.filter((a) => !a.resolved).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Symptom Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Symptom Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    label={{ value: "Trial Day", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="nausea" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="headache" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="energy" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="motivation" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">
              Not enough data points for trend chart
            </p>
          )}
        </CardContent>
      </Card>

      {/* Adherence Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medication Adherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {adherenceData.map((d) => (
              <div
                key={d.day}
                className="flex flex-col items-center gap-1 rounded-lg border p-2 min-w-[60px]"
              >
                <span className="text-[10px] text-slate-500">Day {d.day}</span>
                <div className="flex gap-1">
                  {d.morning ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  {d.evening ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <span className="text-[8px] text-slate-400">AM / PM</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...patient.calls].reverse().map((call) => (
              <div key={call.id} className="relative border-l-2 border-slate-200 pl-4 pb-4">
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-slate-300" />
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedCall(expandedCall === call.id ? null : call.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">
                        Day {call.trialDay}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {call.calledAt
                          ? new Date(call.calledAt).toLocaleString()
                          : "Scheduled"}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        call.outcome === "completed"
                          ? "bg-green-100 text-green-800"
                          : call.outcome === "adverse_event"
                          ? "bg-red-100 text-red-800"
                          : call.outcome === "dropout_risk"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {call.outcome || call.status}
                    </Badge>
                  </div>
                  {call.duration && (
                    <p className="text-xs text-slate-400 mt-1">
                      Duration: {Math.round(call.duration / 60)} min
                    </p>
                  )}
                </div>

                {expandedCall === call.id && call.status === "completed" && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <span className="text-xs text-slate-500">Nausea</span>
                        <p className="font-medium capitalize">{call.nausea || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Headache</span>
                        <p className="font-medium capitalize">{call.headache || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Energy</span>
                        <p className="font-medium capitalize">{call.energyLevel || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Motivation</span>
                        <p className="font-medium">{call.motivation || "—"}/5</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-slate-500">Morning Dose</span>
                        <p className="font-medium">
                          {call.morningDose === true ? "Taken" : call.morningDose === false ? "Missed" : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Evening Dose</span>
                        <p className="font-medium">
                          {call.eveningDose === true ? "Taken" : call.eveningDose === false ? "Missed" : "—"}
                        </p>
                      </div>
                    </div>
                    {call.adverseEvent && (
                      <div className="rounded border border-red-200 bg-red-50 p-2">
                        <span className="text-xs font-medium text-red-800">
                          Adverse Event (Severity: {call.adverseSeverity}/10)
                        </span>
                        <p className="text-sm text-red-700">{call.adverseEvent}</p>
                      </div>
                    )}
                    {call.otherSymptoms && (
                      <div>
                        <span className="text-xs text-slate-500">Other Symptoms</span>
                        <p className="text-sm">{call.otherSymptoms}</p>
                      </div>
                    )}
                    {call.transcript && (
                      <div>
                        <span className="text-xs text-slate-500">Transcript</span>
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap bg-white rounded border p-2">
                          {call.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      {patient.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alert History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patient.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 ${
                    alert.resolved ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          alert.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : alert.severity === "high"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs capitalize text-slate-500">
                        {alert.type.replace("_", " ")}
                      </span>
                    </div>
                    {alert.resolved && (
                      <Badge variant="secondary" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{alert.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
