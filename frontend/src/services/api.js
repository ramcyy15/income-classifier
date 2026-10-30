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

export async function checkSupabaseHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/supabase`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Supabase probe returned ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      configured: true,
      status: "paused",
      project_ref: "vcpxuhvbiqghdweagiaa",
      error: err.message,
      dashboard_url: "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa"
    };
  }
}

export async function classifyBarangay(payload) {
  const res = await fetch(`${API_BASE}/classify-barangay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Barangay classification failed');
  }
  return res.json();
}

export async function uploadBarangayBatchFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/classify-barangay/batch-file`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to process batch upload file');
  }
  return res.json();
}

export function getBatchTemplateDownloadUrl() {
  return `${API_BASE}/classify-barangay/batch-template`;
}

