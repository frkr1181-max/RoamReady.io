// ---------- guides and stages ----------

const ICONS = "assets/figma/";

export const GUIDES = [
  { id: "entry", stage: "plan", title: "Entry & documents", categories: ["entry"],
    blurb: "Visas, passport rules, arrival forms and what you can bring." },
  { id: "money", stage: "plan", title: "Money & payments", categories: ["money"],
    blurb: "Local currency, cards, cash and ATM fees." },
  { id: "phones", stage: "plan", title: "Phones & tech", categories: ["phones", "electricity"],
    blurb: "eSIMs, Wi-Fi, plugs and voltage." },
  { id: "health", stage: "plan", title: "Health", categories: ["health"],
    blurb: "Insurance, vaccines, pharmacies and medicine rules." },
  { id: "there", stage: "arrive", title: "Getting there", categories: ["arrival"],
    blurb: "Airports, arrival steps and getting into the city." },
  { id: "around", stage: "arrive", title: "Getting around", categories: ["getting-around"],
    blurb: "Trains, buses, transit cards and taxis." },
  { id: "safety", stage: "know", title: "Safety", categories: ["safety", "emergency"],
    blurb: "Travel advisories and emergency numbers." },
  { id: "culture", stage: "know", title: "Local culture", categories: ["culture"],
    blurb: "Etiquette, tipping, customs and local laws." },
].map((guide) => ({
  ...guide,
  color: `var(--rr-guide-${guide.id})`,
  tint: `var(--rr-guide-tint-${guide.id})`,
  icon: `${ICONS}tile-${guide.id}.svg`,
  swatch: `${ICONS}swatch-${guide.id}.svg`,
}));

export const STAGES = [
  { id: "plan", label: "Plan" },
  { id: "arrive", label: "Arrive" },
  { id: "know", label: "Know" },
];

export function guideById(id) {
  return GUIDES.find((guide) => guide.id === id);
}

export function guideForCategory(category) {
  return GUIDES.find((guide) => guide.categories.includes(category));
}

// ---------- purposes ----------

export const PURPOSES = [
  { id: "leisure", label: "Leisure", api: "tourism", icon: `${ICONS}purpose-leisure.svg` },
  { id: "work", label: "Work", api: "work", icon: `${ICONS}purpose-work.svg` },
  { id: "study", label: "Study", api: "study", icon: `${ICONS}purpose-study.svg` },
  { id: "emergency", label: "Emergency", api: null, icon: `${ICONS}purpose-emergency.svg` },
];

export function purposeById(id) {
  return PURPOSES.find((purpose) => purpose.id === id);
}

// ---------- grouping ----------

export function groupFacts(facts) {
  const groups = Object.fromEntries(GUIDES.map((guide) => [guide.id, []]));
  for (const fact of facts) {
    const guide = guideForCategory(fact.category);
    if (guide) groups[guide.id].push(fact);
  }
  return groups;
}

// ---------- emergency numbers ----------

const NUM = String.raw`\+?\d[\d-]{0,15}\d`;
const numbersIn = (text) => text.match(new RegExp(NUM, "g")) || [];
const BOILERPLATE = /^Local services handle/;

function tidyLabel(label) {
  const clean = label.replace(/^(an?|the) /i, "").trim();
  const withUs = /^Embassy /.test(clean) ? `U.S. ${clean}` : clean;
  return withUs.charAt(0).toUpperCase() + withUs.slice(1);
}

function parseEmergency(text) {
  const sentences = text
    .split(/(?<=[a-z0-9)])\.\s+(?=[A-Z+])/)
    .map((s) => s.replace(/\.$/, ""))
    .filter((s) => !BOILERPLATE.test(s));
  const rows = [];
  const add = (label, numbers) => {
    const last = rows[rows.length - 1];
    if (last && last.label === tidyLabel(label)) last.numbers.push(...numbers);
    else rows.push({ label: tidyLabel(label), numbers: [...numbers] });
  };
  const either = String.raw`${NUM}(?:\s+or\s+${NUM})*`;
  for (const s of sentences) {
    let m;
    const pairs = [...s.matchAll(new RegExp(String.raw`([A-Z][A-Za-z ,/-]{2,40}?):\s*(${either})`, "g"))];
    if (pairs.length) { pairs.forEach((p) => add(p[1], numbersIn(p[2]))); continue; }
    if ((m = s.match(new RegExp(String.raw`^For (?:an? |immediate |urgent )*(.+?)(?: emergencies| help)?, call (${either})`, "i")))) { add(m[1], numbersIn(m[2])); continue; }
    if ((m = s.match(new RegExp(String.raw`(Embassy \w+)(?: number is|:)\s*(${NUM})`)))) { add(m[1], [m[2]]); continue; }
    if ((m = s.match(new RegExp(String.raw`call (${NUM})(?: for (?:an? )?(?:immediate )?([a-z ,]+?))?(?: in [A-Z]\w+)?$`, "i")))) { add(m[2] || "emergencies", [m[1]]); continue; }
    const listed = [...s.matchAll(new RegExp(String.raw`(${NUM}) for (?:an? |general )?([a-z ,]*?(?:emergencies|emergency help|emergency|police|ambulance|fire))`, "g"))];
    if (listed.length) { listed.forEach((p) => add(p[2], [p[1]])); continue; }
    if ((m = s.match(new RegExp(String.raw`^(.+?) is available at (${NUM})`)))) { add(m[1], [m[2]]); continue; }
  }
  const found = new Set(rows.flatMap((row) => row.numbers));
  const complete = rows.length && sentences.flatMap(numbersIn).every((n) => found.has(n));
  return complete ? { rows } : { text: sentences.join(". ") + "." };
}

export function emergencyNumbers(facts) {
  const fact = facts.find((f) => f.category === "emergency");
  return fact ? parseEmergency(fact.plain_summary) : null;
}
