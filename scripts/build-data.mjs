// Builds data/providers.json (curated real NPI providers + 2 hand-entered)
// and data/outcomes.json (SIMULATED check-ins, deterministic seed).
// Usage: node scripts/build-data.mjs  (after fetch-providers.mjs)
import { readFileSync, writeFileSync } from "node:fs";

const raw = JSON.parse(readFileSync("data/npi-raw.json", "utf8"));
const byId = Object.fromEntries(raw.map((p) => [p.id, p]));

const title = (s) =>
  s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Md|M\.d\.|Np|Mph|Cnm|Inc)\b\.?/gi, (m) => m.toUpperCase());

// Real providers picked by hand (San Francisco locations only).
// Insurance / hours / languages / transit are DEMO ATTRIBUTES — not from NPI.
const PICKS = [
  { id: "1588606206", insurance: ["uninsured", "medicaid", "private"], eveningHours: true,  languages: ["English", "Spanish"], transitNote: "Near Castro Muni station", profile: "strong" },
  { id: "1538101126", insurance: ["uninsured", "medicaid"],            eveningHours: false, languages: ["English", "Spanish", "Tagalog"], transitNote: "Near Balboa Park BART", profile: "good" },
  { id: "1144263518", insurance: ["uninsured", "medicaid"],            eveningHours: false, languages: ["English", "Cantonese"], transitNote: "Muni 30 / 45 lines", profile: "good" },
  { id: "1598705451", insurance: ["uninsured", "medicaid", "private"], eveningHours: true,  languages: ["English", "Cantonese", "Russian"], transitNote: "N-Judah line", profile: "ok" },
  { id: "1376798413", insurance: ["uninsured", "medicaid", "private"], eveningHours: true,  languages: ["English", "Vietnamese", "Spanish"], transitNote: "Near Civic Center BART", profile: "strong" },
  { id: "1417974858", insurance: ["medicaid", "private"],              eveningHours: false, languages: ["English", "Spanish"], transitNote: "Near 24th St Mission BART", profile: "good" },
  { id: "1851335624", insurance: ["private"],                          eveningHours: false, languages: ["English"], transitNote: "Muni 2 / 3 lines", profile: "slow" },
  { id: "1821185133", insurance: ["medicaid", "private"],              eveningHours: true,  languages: ["English"], transitNote: "Near Civic Center BART", profile: "ok" },
  { id: "1417977315", insurance: ["private"],                          eveningHours: false, languages: ["English"], transitNote: "Near Montgomery BART", profile: "new" },
  { id: "1952494973", insurance: ["private", "medicaid"],              eveningHours: true,  languages: ["English", "Spanish"], transitNote: "K-Ingleside line", profile: "ok" },
  { id: "1154458859", insurance: ["uninsured", "medicaid", "private"], eveningHours: false, languages: ["English", "Spanish"], transitNote: "Muni 9 / 33 lines", profile: "good" },
];

const providers = PICKS.map(({ profile, ...pick }) => {
  const p = byId[pick.id];
  if (!p) throw new Error(`missing NPI ${pick.id} in npi-raw.json`);
  const isGeneric = /CITY & COUNTY/i.test(p.name);
  const street = p.address.split(",")[0];
  return {
    id: p.id,
    name: isGeneric ? `SF Dept. of Public Health clinic — ${title(street)}` : title(p.name),
    specialty: p.specialty ?? "Obstetrics & Gynecology",
    address: title(p.address),
    phone: p.phone,
    isClinic: p.isClinic,
    slidingScale: p.slidingScale || isGeneric,
    source: "CMS NPI Registry",
    careTypes: ["cervical_screening", "primary_care"],
    directoryAffirming: false,
    ...pick,
  };
});

providers.push({
  id: "fictional-rww",
  name: "Rainbow Women's Wellness",
  specialty: "Women's Health (fictional demo provider)",
  address: "Market St, San Francisco (fictional)",
  phone: null,
  isClinic: true,
  slidingScale: true,
  source: "fictional",
  careTypes: ["cervical_screening", "primary_care"],
  directoryAffirming: true,
  insurance: ["uninsured", "medicaid", "private"],
  eveningHours: true,
  languages: ["English", "Spanish"],
  transitNote: "Near Church St Muni",
});

providers.push({
  id: "program-ewc",
  name: "Every Woman Counts (California NBCCEDP)",
  specialty: "Free cervical & breast cancer screening program",
  address: "Statewide — call to find an enrolled provider",
  phone: "800-511-2300",
  isClinic: false,
  slidingScale: true,
  source: "program",
  careTypes: ["cervical_screening"],
  directoryAffirming: false,
  insurance: ["uninsured"],
  eveningHours: false,
  languages: ["English", "Spanish", "Chinese", "Vietnamese", "Korean", "Tagalog"],
  transitNote: "Phone referral",
  note: "Free for eligible uninsured/underinsured clients, ages 21–64, at or below 250% FPL.",
});

// ---------- simulated outcomes ----------
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const PROFILES = {
  strong: { n: 9, complete: 0.85, respect: [4, 5, 5], explain: 0.05, days: [7, 21] },
  good:   { n: 7, complete: 0.75, respect: [4, 4, 5], explain: 0.1,  days: [10, 25] },
  ok:     { n: 6, complete: 0.6,  respect: [3, 4, 4], explain: 0.2,  days: [14, 30] },
  slow:   { n: 6, complete: 0.55, respect: [3, 4, 4], explain: 0.15, days: [30, 60] },
  new:    { n: 2, complete: 0.5,  respect: [4, 4, 5], explain: 0.1,  days: [14, 28] },
};

const NOTES_OK = ["Seen quickly, Pap done.", "Easy booking, felt comfortable.", "Got screened and set up with a regular doctor.", "Front desk was kind, screening done.", ""];
const NOTES_MISS = { long_wait: "Waitlisted for weeks, gave up.", no_callback: "Left two voicemails, never heard back.", insurance_issue: "Told they didn't take my coverage after all." };

const outcomes = [];
let k = 0;
for (const p of PICKS) {
  const prof = PROFILES[p.profile];
  for (let i = 0; i < prof.n; i++) {
    const completed = rand() < prof.complete;
    const tag = completed ? "none" : pick(["long_wait", "no_callback", "insurance_issue"]);
    const gotAppt = completed || tag === "insurance_issue";
    outcomes.push({
      id: `seed-${++k}`,
      providerId: p.id,
      careType: "cervical_screening",
      gotAppt,
      daysToAppt: gotAppt ? Math.round(prof.days[0] + rand() * (prof.days[1] - prof.days[0])) : null,
      careCompleted: completed,
      respected: gotAppt ? pick(prof.respect) : null,
      hadToExplain: rand() < prof.explain,
      surpriseCost: rand() < 0.08,
      tag,
      note: completed ? pick(NOTES_OK) : NOTES_MISS[tag],
      simulated: true,
      source: "seed",
    });
  }
}

// Guardrail: real providers never get the "affirming but fails" story —
// keep each real provider's simulated completion at or above ~55%.
for (const p of PICKS) {
  const mine = outcomes.filter((o) => o.providerId === p.id);
  const need = Math.ceil(mine.length * 0.55);
  for (const o of mine) {
    if (mine.filter((x) => x.careCompleted).length >= need) break;
    if (!o.careCompleted) {
      Object.assign(o, { careCompleted: true, gotAppt: true, tag: "none", note: pick(NOTES_OK),
        daysToAppt: o.daysToAppt ?? 21, respected: o.respected ?? 4 });
    }
  }
}

// The demo case: warm and affirming, but the screening doesn't happen.
const RWW = [
  [true, 5, "told_no_pap_needed", "Lovely staff. Doctor said I didn't need a Pap since I only date women."],
  [true, 5, "told_no_pap_needed", "Felt totally welcome, but she said screening 'wasn't really necessary' for me."],
  [true, 4, "none", "Great visit, Pap done."],
  [true, 5, "told_no_pap_needed", "Rainbow flag everywhere, super kind. Left without a Pap — said low risk."],
  [true, 4, "no_callback", "Nice visit but they never called with results or a follow-up."],
  [true, 5, "none", "Pap done, felt seen."],
  [true, 4, "told_no_pap_needed", "Asked about a Pap, was told lesbians don't really need them."],
  [false, null, "no_callback", "Never got a call back to schedule."],
];
for (const [gotAppt, respected, tag, note] of RWW) {
  outcomes.push({
    id: `seed-${++k}`, providerId: "fictional-rww", careType: "cervical_screening",
    gotAppt, daysToAppt: gotAppt ? Math.round(5 + rand() * 10) : null,
    careCompleted: tag === "none", respected, hadToExplain: false, surpriseCost: false,
    tag, note, simulated: true, source: "seed",
  });
}

writeFileSync("data/providers.json", JSON.stringify(providers, null, 2));
writeFileSync("data/outcomes.json", JSON.stringify(outcomes, null, 2));
console.log(`${providers.length} providers, ${outcomes.length} simulated outcomes`);
