import { purposeById } from "./guides.js";

// ---------- trip in the address ----------

const FIELDS = ["country", "from", "to", "purpose", "name", "id"];

export const DEMO_TRIP = null;
let description = "";

export function tripFromQuery(query) {
  const params = new URLSearchParams(query);
  const trip = Object.fromEntries(FIELDS.map((field) => [field, params.get(field) || ""]));
  if (!purposeById(trip.purpose)) trip.purpose = "";
  if (trip.id && !/^[0-9a-f-]{36}$/i.test(trip.id)) trip.id="";
  return trip.country ? { ...trip, description } : null;
}

export function tripToQuery(trip) {
  const params = new URLSearchParams();
  for (const field of FIELDS) if (trip?.[field]) params.set(field, trip[field]);
  return params.toString();
}

export function rememberDescription(text) {
  description = text;
}

// ---------- dates ----------

function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [y, m, d] = value.split("-").map(Number);
  const timestamp=Date.UTC(y,m-1,d);
  return new Date(timestamp).toISOString().slice(0,10)===value ? timestamp : null;
}

export function tripDays(trip) {
  const start = parseDay(trip.from);
  const end = parseDay(trip.to);
  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatRange(trip) {
  const start = parseDay(trip.from);
  const end = parseDay(trip.to);
  if (start === null || end === null) return "Dates not set";
  const sameYear = new Date(start).getUTCFullYear() === new Date(end).getUTCFullYear();
  return `${sameYear ? monthDay.format(start) : fullDate.format(start)} – ${fullDate.format(end)}`;
}

// ---------- facts filter ----------

export function factQuery(trip) {
  const days = tripDays(trip) === null ? null : Math.min(tripDays(trip), 36500);
  return {
    stayMin: days,
    stayMax: days,
    purpose: purposeById(trip.purpose)?.api ?? null,
  };
}
