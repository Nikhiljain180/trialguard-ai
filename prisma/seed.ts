import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PATIENT_NAMES = [
  "Sarah Mitchell",
  "Robert Chen",
  "Maria Garcia",
  "James Wilson",
  "Priya Patel",
  "Thomas Anderson",
  "Lisa Nakamura",
  "David Okonkwo",
  "Eleanor Wright",
  "Carlos Rivera",
];

const PHONES = [
  "+14155551001",
  "+14155551002",
  "+14155551003",
  "+14155551004",
  "+14155551005",
  "+14155551006",
  "+14155551007",
  "+14155551008",
  "+14155551009",
  "+14155551010",
];

const nauseaLevels = ["none", "mild", "moderate", "severe"];
const headacheLevels = ["none", "mild", "moderate", "severe"];
const energyLevels = ["low", "moderate", "high"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  await prisma.alert.deleteMany();
  await prisma.call.deleteMany();
  await prisma.patient.deleteMany();

  const trialDays = [58, 45, 32, 27, 19, 14, 10, 7, 42, 35];
  const arms = [
    "treatment", "treatment", "placebo", "treatment", "placebo",
    "treatment", "placebo", "treatment", "treatment", "placebo",
  ];
  const statuses = [
    "active", "active", "active", "active", "active",
    "active", "flagged", "active", "active", "active",
  ];
  const risks: Array<"low" | "medium" | "high"> = [
    "low", "low", "medium", "low", "high",
    "low", "high", "low", "medium", "low",
  ];

  for (let i = 0; i < PATIENT_NAMES.length; i++) {
    const trialDay = trialDays[i];
    const enrollmentDate = daysAgo(trialDay);

    const patient = await prisma.patient.create({
      data: {
        name: PATIENT_NAMES[i],
        phone: PHONES[i],
        email: `${PATIENT_NAMES[i].toLowerCase().replace(" ", ".")}@email.com`,
        trialArm: arms[i],
        enrollmentDate,
        trialDay,
        status: statuses[i],
        dropoutRisk: risks[i],
      },
    });

    const callCount = Math.min(trialDay, randomInt(3, 6));
    for (let c = 0; c < callCount; c++) {
      const callTrialDay = trialDay - (callCount - 1 - c);
      const calledAt = daysAgo(callCount - 1 - c);
      calledAt.setHours(9, randomInt(0, 30), 0, 0);

      const morningDose = Math.random() > 0.15;
      const eveningDose = Math.random() > 0.2;
      const nausea = randomChoice(nauseaLevels);
      const headache = randomChoice(headacheLevels);
      const energy = randomChoice(energyLevels);
      const motivation = randomInt(2, 5);

      let adverseEvent: string | null = null;
      let adverseSeverity: number | null = null;
      let outcome = "completed";

      if (risks[i] === "high" && c === callCount - 1) {
        adverseEvent = "Persistent dizziness and blurred vision";
        adverseSeverity = 8;
        outcome = "adverse_event";
      } else if (risks[i] === "medium" && c === callCount - 1) {
        adverseEvent = null;
        outcome = motivation <= 2 ? "dropout_risk" : "completed";
      }

      const call = await prisma.call.create({
        data: {
          patientId: patient.id,
          bolnaCallId: `bolna_call_${patient.id}_${c}`,
          status: "completed",
          trialDay: callTrialDay,
          nausea,
          headache,
          energyLevel: energy,
          otherSymptoms: c === callCount - 1 && i === 2 ? "Mild joint stiffness in the morning" : null,
          morningDose,
          eveningDose,
          adverseEvent,
          adverseSeverity,
          motivation,
          transcript: `[Automated transcript for ${PATIENT_NAMES[i]} - Day ${callTrialDay}] Agent: Hi ${PATIENT_NAMES[i].split(" ")[0]}, this is your daily check-in call from the PharmaCorp clinical trial team. You're on day ${callTrialDay} of the study...`,
          duration: randomInt(120, 300),
          outcome,
          calledAt,
          completedAt: new Date(calledAt.getTime() + randomInt(120, 300) * 1000),
        },
      });

      if (outcome === "adverse_event") {
        await prisma.alert.create({
          data: {
            patientId: patient.id,
            callId: call.id,
            type: "adverse_event",
            severity: "critical",
            message: `Adverse event reported (severity ${adverseSeverity}/10): ${adverseEvent}`,
            resolved: false,
            createdAt: call.calledAt!,
          },
        });
      }

      if (outcome === "dropout_risk") {
        await prisma.alert.create({
          data: {
            patientId: patient.id,
            callId: call.id,
            type: "dropout_risk",
            severity: "high",
            message: `Low motivation score (${motivation}/5). Patient may be considering withdrawal.`,
            resolved: false,
            createdAt: call.calledAt!,
          },
        });
      }

      if (!morningDose && !eveningDose) {
        await prisma.alert.create({
          data: {
            patientId: patient.id,
            callId: call.id,
            type: "missed_dose",
            severity: "medium",
            message: `Both morning and evening doses missed on trial day ${callTrialDay}.`,
            resolved: c < callCount - 1,
            resolvedAt: c < callCount - 1 ? new Date(calledAt.getTime() + 86400000) : undefined,
            createdAt: call.calledAt!,
          },
        });
      }
    }
  }

  const counts = await Promise.all([
    prisma.patient.count(),
    prisma.call.count(),
    prisma.alert.count(),
  ]);
  console.log(`Seeded: ${counts[0]} patients, ${counts[1]} calls, ${counts[2]} alerts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
