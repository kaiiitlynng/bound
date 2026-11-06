export type CareType = "cervical_screening" | "primary_care";
export type Insurance = "uninsured" | "medicaid" | "private" | "unknown";

export const TAGS = [
  "told_no_pap_needed",
  "long_wait",
  "misgendered",
  "insurance_issue",
  "no_callback",
  "none",
] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Exclude<Tag, "none">, string> = {
  told_no_pap_needed: "told screening isn't needed",
  long_wait: "a long wait for an appointment",
  misgendered: "being misgendered or having identity assumed",
  insurance_issue: "insurance or coverage problems",
  no_callback: "never getting a call back",
};

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone: string | null;
  isClinic: boolean;
  slidingScale: boolean;
  source: "CMS NPI Registry" | "fictional" | "program";
  careTypes: CareType[];
  directoryAffirming: boolean;
  insurance: Insurance[];
  eveningHours: boolean;
  languages: string[];
  transitNote: string;
  note?: string;
}

/** One closed-out referral. No client identity, ever. */
export interface Outcome {
  id: string;
  providerId: string;
  careType: CareType;
  gotAppt: boolean;
  daysToAppt: number | null;
  careCompleted: boolean;
  respected: number | null; // 1–5
  hadToExplain: boolean;
  surpriseCost: boolean;
  tag: Tag;
  note: string;
  simulated: boolean;
  source: "seed" | "checkin";
  date?: string;
}

export interface NeedFilters {
  care_type: CareType;
  insurance: Insurance;
  needs_evening: boolean;
  needs_transit: boolean;
  language: string;
  pii_detected: boolean;
}

export interface CheckinResult {
  got_appt: boolean;
  days_to_appt: number | null;
  care_completed: boolean;
  respected: number | null;
  had_to_explain: boolean;
  surprise_cost: boolean;
  tag: Tag;
  crisis: boolean;
}

export type ReferralStatus = "awaiting" | "closed" | "no_response" | "handoff";

/** A referral record: care type, provider, dates. No client name, contact, or identity. */
export interface Referral {
  id: string;
  providerId: string;
  careType: CareType;
  createdAt: string;
  checkinDue: string;
  method: "text" | "call";
  needSummary: string;
  status: ReferralStatus;
  outcomeId?: string;
  closedAt?: string;
}

/** Staff knowledge about a provider. Never about a specific client. */
export interface StaffNote {
  id: string;
  providerId: string;
  text: string;
  createdAt: string;
}

export interface NeedForm {
  careType: CareType | null;
  primaryCare: boolean | null;
  insurance: Insurance | null;
  hours: "any" | "evenings" | null;
  transport: "car" | "transit" | "ride" | null;
  language: string | null;
}

export interface Explanation {
  affirming: string;
  client_explainer: string;
}
