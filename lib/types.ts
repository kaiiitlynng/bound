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

export interface Referral {
  id: string;
  providerId: string;
  careType: CareType;
  createdAt: string;
}

export interface Explanation {
  reason: string;
  booking_script: string;
  client_explainer: string;
}
