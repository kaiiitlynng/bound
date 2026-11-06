import type { NeedFilters, NeedForm } from "./types";

export const LANGUAGES = ["English", "Spanish", "Cantonese", "Mandarin", "Vietnamese", "Tagalog", "Russian", "Korean", "Other"];

export const EMPTY_NEED: NeedForm = {
  careType: "cervical_screening",
  primaryCare: null,
  insurance: null,
  hours: null,
  transport: null,
  language: null,
};

export const NEED_FIELDS = ["careType", "primaryCare", "insurance", "hours", "transport", "language"] as const;

export const answered = (f: NeedForm) => NEED_FIELDS.filter((k) => f[k] != null).length;
export const isComplete = (f: NeedForm) => answered(f) === NEED_FIELDS.length;

export function toFilters(f: NeedForm): NeedFilters {
  return {
    care_type: f.careType ?? "cervical_screening",
    insurance: f.insurance ?? "unknown",
    needs_evening: f.hours === "evenings",
    needs_transit: f.transport === "transit" || f.transport === "ride",
    language: f.language === "Other" || !f.language ? "English" : f.language,
    pii_detected: false,
  };
}

const INSURANCE_LABEL = { uninsured: "Uninsured", medicaid: "Medi-Cal", private: "Private insurance", unknown: "Insurance unknown" } as const;
const TRANSPORT_LABEL = { car: "has a car", transit: "public transit", ride: "needs a ride" } as const;

/** De-identified one-liner stored on the referral and sent to Claude for scripts. */
export function needSummary(f: NeedForm): string {
  return [
    f.insurance ? INSURANCE_LABEL[f.insurance] : null,
    f.hours === "evenings" ? "evenings" : "any time",
    f.transport ? TRANSPORT_LABEL[f.transport] : null,
    f.language,
    f.primaryCare ? "also needs a regular doctor" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Map Claude's parse of a plain-language description onto the form. Leaves unknowns blank for staff. */
export function fromFilters(prev: NeedForm, f: NeedFilters, text: string): NeedForm {
  const lang = LANGUAGES.find((l) => l.toLowerCase() === f.language.trim().toLowerCase());
  const mentionsLanguage = /speak|language|spanish|cantonese|mandarin|chinese|vietnamese|tagalog|russian|korean|english/i.test(text);
  return {
    careType: "cervical_screening",
    // Only set when the text actually says so; otherwise staff answers it.
    primaryCare: /no (regular )?doctor|needs? a (regular )?doctor|regular doctor|primary care|\bpcp\b/i.test(text)
      ? !/has a (regular )?doctor|has a pcp/i.test(text)
      : prev.primaryCare,
    insurance: f.insurance === "unknown" ? prev.insurance : f.insurance,
    hours: f.needs_evening ? "evenings" : prev.hours,
    transport: f.needs_transit ? "transit" : /\bcar\b/i.test(text) && !/no car/i.test(text) ? "car" : prev.transport,
    language: mentionsLanguage ? (lang ?? "Other") : prev.language,
  };
}
