import { DISTRICT_V_BARANGAYS, LEVELS } from "../constants/levels";

/**
 * Expected income level (1–3) weighted by the model's class probabilities.
 * Lower = higher need. Used as the priority score so barangays with the same
 * predicted level are still ordered by how close they sit to Level 1.
 */
export function expectedLevel(probabilities) {
  if (!probabilities) return null;
  const pLow = Number(probabilities.Low) || 0;
  const pMid = Number(probabilities.Middle) || 0;
  const pHigh = Number(probabilities.High) || 0;
  const total = pLow + pMid + pHigh;
  if (total <= 0) return null;
  return (1 * pLow + 2 * pMid + 3 * pHigh) / total;
}

/** The strongest indicator pushing toward the predicted level, from SHAP when available. */
export function topDriver(record) {
  const supporting = record?.shap?.contributions?.find((c) => c.shap > 0);
  if (supporting) return { feature: supporting.feature, value: supporting.value };
  const legacy = record?.feature_impacts?.[0];
  return legacy ? { feature: legacy.feature, value: legacy.user_value } : null;
}

/**
 * Latest saved classification for each District V barangay, ranked by priority.
 * Returns { ranked: [...classified rows], missing: [...barangay names] }.
 */
export function buildDistrictRanking(history) {
  const latest = {};
  for (const rec of history || []) {
    if (rec?.type !== "barangay" || !DISTRICT_V_BARANGAYS.includes(rec.barangay)) continue;
    if (!LEVELS[rec.predicted_class]) continue;
    const prev = latest[rec.barangay];
    if (!prev || new Date(rec.timestamp) > new Date(prev.timestamp)) latest[rec.barangay] = rec;
  }

  const ranked = Object.values(latest)
    .map((rec) => ({
      barangay: rec.barangay,
      record: rec,
      level: rec.predicted_class,
      expected: expectedLevel(rec.probabilities),
      pLevel1: Number(rec.probabilities?.Low) || 0,
      driver: topDriver(rec),
      timestamp: rec.timestamp,
    }))
    .sort(
      (a, b) =>
        (a.expected ?? LEVELS[a.level].num) - (b.expected ?? LEVELS[b.level].num) ||
        b.pLevel1 - a.pLevel1 ||
        a.barangay.localeCompare(b.barangay)
    )
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const missing = DISTRICT_V_BARANGAYS.filter((b) => !latest[b]);
  return { ranked, missing };
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function rankingToCSV(ranked, missing) {
  const header = [
    "Rank (most in need first)", "Barangay", "Level", "Meaning", "Need score (1 = most need)",
    "Chance of Level 1 (%)", "Main reason", "Value", "Checked on",
  ];
  const rows = ranked.map((r) => [
    r.rank, r.barangay, LEVELS[r.level].short, LEVELS[r.level].need,
    r.expected != null ? r.expected.toFixed(2) : "",
    (r.pLevel1 * 100).toFixed(1),
    r.driver?.feature ?? "", r.driver?.value ?? "",
    r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
  ]);
  const missingRows = missing.map((b) => ["", b, "Not checked", "", "", "", "", "", ""]);
  return [header, ...rows, ...missingRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
