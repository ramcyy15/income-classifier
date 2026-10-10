// In production (Vercel), VITE_API_URL points to the Render backend.
// In local dev, fall back to '/api' (proxied by vite.config.js to localhost:8000).
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function checkServerHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function fetchOverview() {
  const res = await fetch(`${API_BASE}/overview`);
  if (!res.ok) throw new Error('Failed to load overview data');
  return res.json();
}

export async function fetchBarangays() {
  const res = await fetch(`${API_BASE}/barangays`);
  if (!res.ok) throw new Error('Failed to load barangays');
  return res.json();
}

export async function fetchBarangayDetails(name) {
  const res = await fetch(`${API_BASE}/barangays/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Failed to load details for ${name}`);
  return res.json();
}

export async function runSimulation(payload) {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function runGoalSeek(payload) {
  const res = await fetch(`${API_BASE}/goal-seek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Goal-seek failed');
  return res.json();
}

export async function fetchGeoJSON() {
  const res = await fetch(`${API_BASE}/geojson/polygons`);
  if (!res.ok) throw new Error('Failed to load geojson polygons');
  return res.json();
}

export async function generateLivePolicyBrief(barangayName) {
  const res = await fetch(`${API_BASE}/policy-brief/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barangay: barangayName }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to generate live policy brief');
  }
  return res.json();
}

export async function classifyIndividual(payload) {
  const res = await fetch(`${API_BASE}/classify-individual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function classifyBarangay(payload) {
  const res = await fetch(`${API_BASE}/classify-barangay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

