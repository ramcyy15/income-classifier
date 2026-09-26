const STORAGE_KEY = "qc5_classification_history";

export function getClassificationHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read classification history", e);
    return [];
  }
}

export function saveClassificationRecord(record) {
  try {
    const history = getClassificationHistory();
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...record,
    };
    // Keep last 30 entries
    const updated = [newEntry, ...history.filter(item => item.id !== newEntry.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for real-time reactive updates across components
    window.dispatchEvent(new Event("qc5_history_updated"));
    return updated;
  } catch (e) {
    console.error("Failed to save classification history", e);
    return [];
  }
}

export function clearClassificationHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("qc5_history_updated"));
  } catch (e) {
    console.error("Failed to clear classification history", e);
  }
}
