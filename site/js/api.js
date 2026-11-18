import { API_BASE, SAVED_GUIDES_ONLY } from "./config.js?v=20261110-original24";

// ---------- settings and state ----------

const TIMEOUT_MS = 4000;
const SNAPSHOT_URL = "data/guide-snapshot.json?v=20261110-original24";

let mode = null;
let snapshot = null;
const factCache = new Map();
const listeners = new Set();

// ---------- data source ----------

export function onSourceChange(listener) {
  listeners.add(listener);
  if (mode) listener(sourceInfo());
}

export function sourceInfo() {
  return { mode, newestCheck: snapshot?.newest_check ?? null };
}

function setMode(next) {
  mode = next;
  listeners.forEach((listener) => listener(sourceInfo()));
}

// ---------- requests ----------

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(new URL(path, API_BASE), { signal: controller.signal });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const error = new Error(typeof detail.detail === "string" ? detail.detail : `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const backendDown = (error) => !error.status || error.status >= 500;

async function loadSnapshot() {
  if (!snapshot) {
    const response = await fetch(SNAPSHOT_URL);
    if (!response.ok) throw new Error("The saved guide data couldn't be loaded.");
    snapshot = await response.json();
  }
  return snapshot;
}

// ---------- filtering ----------

export function filterFacts(facts, { stayMin = null, stayMax = null, purpose = null } = {}) {
  const hasRange = stayMin !== null || stayMax !== null;
  const lo = hasRange ? stayMin ?? 1 : null;
  const hi = hasRange ? stayMax ?? 36500 : null;
  return facts.filter((fact) => {
    if (!["general", "conditional"].includes(fact.applicability_status)) return false;
    const min = fact.min_stay_days;
    const max = fact.max_stay_days;
    const purposes = fact.applies_to_purposes;
    if (!hasRange) {
      if (min != null || max != null) return false;
    } else {
      if (max != null && lo > max) return false;
      if (min != null && hi < min) return false;
    }
    if (purpose === null) return purposes == null;
    return purposes == null || purposes.includes(purpose);
  });
}

// ---------- countries and facts ----------

export async function getDestinations() {
  if (SAVED_GUIDES_ONLY) {
    const data = await loadSnapshot();
    if (mode !== "snapshot") setMode("snapshot");
    return data.destinations;
  }
  if (mode !== "snapshot") {
    try {
      const rows = await getJson("/api/destinations");
      if (mode !== "live") setMode("live");
      return rows;
    } catch (error) {
      if (!backendDown(error)) throw error;
      console.info("[RoamReady] API not reachable, using the saved guide data:", error.message);
      await loadSnapshot();
      setMode("snapshot");
    }
  }
  return (await loadSnapshot()).destinations;
}

export async function getFacts(slug, { stayMin = null, stayMax = null, purpose = null } = {}) {
  const key = JSON.stringify([slug, stayMin, stayMax, purpose]);
  if (factCache.has(key)) return factCache.get(key);

  if (!mode) await getDestinations();
  let facts;
  if (mode === "live") {
    const query = new URLSearchParams();
    if (stayMin !== null) query.set("stay_days_min", stayMin);
    if (stayMax !== null) query.set("stay_days_max", stayMax);
    if (purpose) query.set("purpose", purpose);
    const qs = query.toString();
    try {
      facts = await getJson(`/api/destinations/${encodeURIComponent(slug)}/facts${qs ? `?${qs}` : ""}`);
    } catch (error) {
      if (!backendDown(error)) throw error;
      console.info("[RoamReady] facts request failed, using the saved guide data:", error.message);
      await loadSnapshot();
      setMode("snapshot");
    }
  }
  if (!facts) {
    const data = await loadSnapshot();
    facts = filterFacts(data.facts.filter((fact) => fact.destination_slug === slug), { stayMin, stayMax, purpose });
  }
  factCache.set(key, facts);
  return facts;
}

export function retryLive() { mode=null; factCache.clear(); }
