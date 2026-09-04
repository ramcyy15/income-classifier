const API_BASE = '/api';

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
