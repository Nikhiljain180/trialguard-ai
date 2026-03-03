const BOLNA_API_URL = process.env.BOLNA_API_URL || "https://api.bolna.dev";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY || "";
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID || "";

interface MakeCallParams {
  agentId?: string;
  recipientPhone: string;
  patientName: string;
  trialDay: number;
  lastSymptoms: string;
}

interface BolnaCallResponse {
  id?: string;
  call_id?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

interface WebhookPayload {
  call_id?: string;
  id?: string;
  agent_id?: string;
  status?: string;
  transcript?: string;
  summary?: string;
  duration?: number;
  conversation_duration?: number;
  telephony_data?: { recording_url?: string };
  extracted_data?: {
    nausea?: string;
    headache?: string;
    energy_level?: string;
    other_symptoms?: string;
    morning_dose?: boolean;
    evening_dose?: boolean;
    adverse_event?: string;
    adverse_severity?: number;
    motivation?: number;
    outcome?: string;
  };
  [key: string]: unknown;
}

interface ParsedCallData {
  bolnaCallId: string;
  status: string;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string | null;
  duration: number | null;
  nausea: string | null;
  headache: string | null;
  energyLevel: string | null;
  otherSymptoms: string | null;
  morningDose: boolean | null;
  eveningDose: boolean | null;
  adverseEvent: string | null;
  adverseSeverity: number | null;
  motivation: number | null;
  outcome: string;
}

async function bolnaFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BOLNA_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOLNA_API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bolna API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function makeCall(params: MakeCallParams): Promise<BolnaCallResponse> {
  const agentId = params.agentId || BOLNA_AGENT_ID;

  const contextData = {
    patient_name: params.patientName,
    trial_day: String(params.trialDay),
    last_symptoms: params.lastSymptoms || "None reported",
  };

  const body = {
    agent_id: agentId,
    recipient_phone_number: params.recipientPhone,
    user_data: contextData,
    // Bolna may also expect recipient_data for agent variables (patient_name, trial_day, last_symptoms)
    recipient_data: contextData,
  };

  return bolnaFetch(`/call`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCallStatus(callId: string): Promise<BolnaCallResponse> {
  return bolnaFetch(`/call/${callId}`);
}

export function parseWebhook(payload: WebhookPayload): ParsedCallData {
  const extracted = payload.extracted_data || {};

  let outcome = extracted.outcome || "completed";
  if (extracted.adverse_severity && extracted.adverse_severity >= 7) {
    outcome = "adverse_event";
  } else if (extracted.motivation && extracted.motivation <= 2) {
    outcome = "dropout_risk";
  }

  // Bolna sends "id" for call ID, "conversation_duration" for duration
  const callId = payload.call_id ?? payload.id ?? "";
  const duration = payload.duration ?? (payload as { conversation_duration?: number }).conversation_duration ?? null;

  const recordingUrl = payload.telephony_data?.recording_url || null;

  return {
    bolnaCallId: typeof callId === "string" ? callId : String(callId),
    status: payload.status || "completed",
    transcript: payload.transcript || null,
    summary: payload.summary || null,
    recordingUrl,
    duration: duration != null ? Math.round(duration) : null,
    nausea: extracted.nausea || null,
    headache: extracted.headache || null,
    energyLevel: extracted.energy_level || null,
    otherSymptoms: extracted.other_symptoms || null,
    morningDose: extracted.morning_dose ?? null,
    eveningDose: extracted.evening_dose ?? null,
    adverseEvent: extracted.adverse_event || null,
    adverseSeverity: extracted.adverse_severity ?? null,
    motivation: extracted.motivation ?? null,
    outcome,
  };
}

export { BOLNA_AGENT_ID };
