const STORAGE_KEY = "qc5_classification_history";
const MAX_RECORDS = 100;

/**
 * Retrieve the full classification history from localStorage.
 * Returns an empty array on parse errors.
 */
export function getClassificationHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read classification history", e);
    return [];
  }
}

/**
 * Save a single classification record to history.
 * Prepends the new entry, deduplicates by id, and caps at MAX_RECORDS.
 */
export function saveClassificationRecord(record) {
  try {
    const history = getClassificationHistory();
    const newEntry = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };
    const updated = [newEntry, ...history.filter((item) => item.id !== newEntry.id)].slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for real-time reactive updates across components
    window.dispatchEvent(new Event("qc5_history_updated"));
    return updated;
  } catch (e) {
    console.error("Failed to save classification history", e);
    return [];
  }
}

/**
 * Save multiple classification records from a batch upload run.
 * Each record gets a unique timestamp-based id.
 */
export function saveBatchClassificationRecords(records) {
  try {
    const history = getClassificationHistory();
    const now = Date.now();
    const newEntries = records.map((record, i) => ({
      id: `batch_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(now + i).toISOString(), // slightly offset so they sort correctly
      ...record,
    }));
    const combined = [...newEntries, ...history].slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    window.dispatchEvent(new Event("qc5_history_updated"));
    return combined;
  } catch (e) {
    console.error("Failed to save batch classification records", e);
    return [];
  }
}

/**
 * Delete a single record by its id.
 */
export function deleteClassificationRecord(id) {
  try {
    const history = getClassificationHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("qc5_history_updated"));
    return updated;
  } catch (e) {
    console.error("Failed to delete classification record", e);
    return [];
  }
}

/**
 * Clear the entire history and notify listeners.
 */
export function clearClassificationHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("qc5_history_updated"));
  } catch (e) {
    console.error("Failed to clear classification history", e);
  }
}
