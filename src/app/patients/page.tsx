"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  Plus,
  Search,
  Loader2,
  ExternalLink,
  PhoneCall,
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  trialArm: string;
  trialDay: number;
  status: string;
  dropoutRisk: string;
  enrollmentDate: string;
  lastCall: {
    outcome: string | null;
    calledAt: string | null;
  } | null;
  activeAlerts: number;
}

function riskBadge(risk: string) {
  switch (risk) {
    case "low":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>;
    case "medium":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Medium</Badge>;
    case "high":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
    default:
      return <Badge variant="secondary">{risk}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
    case "flagged":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Flagged</Badge>;
    case "withdrawn":
      return <Badge variant="secondary">Withdrawn</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [callingId, setCallingId] = useState<string | null>(null);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", trialArm: "treatment" });

  const loadPatients = useCallback(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const triggerCall = async (patientId: string) => {
    setCallingId(patientId);
    setCallMessage(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      setCallMessage(data.message || data.error || "Call initiated");
      loadPatients();
    } catch {
      setCallMessage("Failed to initiate call");
    } finally {
      setCallingId(null);
      setTimeout(() => setCallMessage(null), 4000);
    }
  };

  const addPatient = async () => {
    if (!newPatient.name || !newPatient.phone) return;
    await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newPatient,
        enrollmentDate: new Date().toISOString(),
        trialDay: 1,
      }),
    });
    setNewPatient({ name: "", phone: "", trialArm: "treatment" });
    setAddOpen(false);
    loadPatients();
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Cohort</h1>
          <p className="text-sm text-slate-500">
            {patients.length} enrolled patients
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll New Patient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Patient name"
                value={newPatient.name}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, name: e.target.value })
                }
              />
              <Input
                placeholder="Phone number (e.g. +14155551234)"
                value={newPatient.phone}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, phone: e.target.value })
                }
              />
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={newPatient.trialArm}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, trialArm: e.target.value })
                }
              >
                <option value="treatment">Treatment Arm</option>
                <option value="placebo">Placebo Arm</option>
              </select>
              <Button className="w-full" onClick={addPatient}>
                Enroll Patient
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {callMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <PhoneCall className="mr-2 inline h-4 w-4" />
          {callMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search patients..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Arm</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Call</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {p.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-xs text-slate-500">{p.phone}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {p.trialDay}/90
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {p.trialArm}
                  </TableCell>
                  <TableCell>{riskBadge(p.dropoutRisk)}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {p.lastCall?.calledAt
                      ? new Date(p.lastCall.calledAt).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {p.activeAlerts > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {p.activeAlerts}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={callingId === p.id}
                      onClick={() => triggerCall(p.id)}
                    >
                      {callingId === p.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Phone className="mr-1 h-3 w-3" />
                      )}
                      Call
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
