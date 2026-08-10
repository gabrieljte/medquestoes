import { useCallback, useEffect, useState } from "react";

export const SYNCED_STORAGE_KEYS = [
  "medquestoes-study-organizer-v1",
  "medquiz-academic-calendar-v1",
  "medquestoes-osce-progress",
  "medquestoes-saved-lists",
  "medquestoes-saved-simulations",
  "medquestoes-active-list",
  "medquestoes-theme",
  "medquestoes-sidebar-collapsed"
];

export const LOCAL_CHANGE_EVENT = "medquestoes:local-data-change";
export const DATA_UPDATE_EVENT = "medquestoes:synced-data-update";
const META_PREFIX = "medquestoes:sync-meta:";

function safeParse(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    if (typeof fallback === "string") return value;
    if (typeof fallback === "boolean") return value === "true";
    return fallback;
  }
}

export function readSyncedValue(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

export function getSyncMeta(key) {
  return safeParse(localStorage.getItem(`${META_PREFIX}${key}`), {});
}

export function hasUsefulData(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== "";
}

export function writeSyncedValue(key, value, options = {}) {
  const updatedAt = options.updatedAt || new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(value));
  localStorage.setItem(`${META_PREFIX}${key}`, JSON.stringify({
    updatedAt,
    pending: options.source !== "cloud"
  }));

  window.dispatchEvent(new CustomEvent(DATA_UPDATE_EVENT, { detail: { key, value } }));
  if (options.source !== "cloud") {
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, {
      detail: { key, value, updatedAt }
    }));
  }
  return value;
}

export function markSynced(key, updatedAt) {
  localStorage.setItem(`${META_PREFIX}${key}`, JSON.stringify({
    updatedAt,
    pending: false
  }));
}

export function mergeFirstSync(localValue, cloudValue) {
  if (!Array.isArray(localValue) || !Array.isArray(cloudValue)) {
    return hasUsefulData(cloudValue) ? cloudValue : localValue;
  }

  const byId = new Map();
  [...cloudValue, ...localValue].forEach((item, index) => {
    const id = item && typeof item === "object" && item.id
      ? String(item.id)
      : JSON.stringify(item) || String(index);
    const previous = byId.get(id);
    const previousDate = previous?.updatedAt || previous?.createdAt || "";
    const currentDate = item?.updatedAt || item?.createdAt || "";
    if (!previous || currentDate >= previousDate) byId.set(id, item);
  });
  return [...byId.values()];
}

export function useSyncedStorage(key, fallback) {
  const [value, setValueState] = useState(() => readSyncedValue(key, fallback));

  useEffect(() => {
    function receive(event) {
      if (event.detail?.key === key) setValueState(event.detail.value);
    }
    window.addEventListener(DATA_UPDATE_EVENT, receive);
    return () => window.removeEventListener(DATA_UPDATE_EVENT, receive);
  }, [key]);

  const setValue = useCallback(nextValue => {
    setValueState(current => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
      writeSyncedValue(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, setValue];
}
