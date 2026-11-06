// One-off: pull real San Francisco providers from the CMS NPI Registry.
// Usage: node scripts/fetch-providers.mjs  → writes data/npi-raw.json
import { writeFileSync } from "node:fs";

const CITY = "San Francisco";
const STATE = "CA";
const TAXONOMIES = [
  "Obstetrics & Gynecology",
  "Family Medicine",
  "Federally Qualified*",
  "Nurse Practitioner, Women's Health*",
];

async function npiSearch(taxonomy) {
  const url = new URL("https://npiregistry.cms.hhs.gov/api/");
  url.search = new URLSearchParams({
    version: "2.1",
    taxonomy_description: taxonomy,
    city: CITY,
    state: STATE,
    limit: "20",
  }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${taxonomy}: HTTP ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

const providers = [];
const seen = new Set();
for (const t of TAXONOMIES) {
  let results = [];
  try {
    results = await npiSearch(t);
  } catch (e) {
    console.warn(String(e));
  }
  console.log(`${t}: ${results.length}`);
  for (const p of results) {
    if (seen.has(p.number)) continue;
    seen.add(p.number);
    const b = p.basic ?? {};
    const name =
      b.organization_name ??
      [b.first_name, b.last_name, b.credential].filter(Boolean).join(" ");
    const loc = (p.addresses ?? []).find((a) => a.address_purpose === "LOCATION") ?? {};
    const primary = (p.taxonomies ?? []).find((x) => x.primary) ?? {};
    providers.push({
      id: p.number,
      name,
      specialty: primary.desc ?? null,
      address: `${loc.address_1 ?? ""}, ${loc.city ?? ""} ${String(loc.postal_code ?? "").slice(0, 5)}`,
      phone: loc.telephone_number ?? null,
      isClinic: p.enumeration_type === "NPI-2",
      slidingScale: /Federally Qualified/i.test(primary.desc ?? ""),
      source: "CMS NPI Registry",
      query: t,
    });
  }
}
writeFileSync("data/npi-raw.json", JSON.stringify(providers, null, 2));
console.log(`${providers.length} providers saved to data/npi-raw.json`);
