import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import {
  LOCAL_CHANGE_EVENT,
  SYNCED_STORAGE_KEYS,
  getSyncMeta,
  hasUsefulData,
  markSynced,
  mergeFirstSync,
  readSyncedValue,
  writeSyncedValue
} from "./syncedStorage.js";

export function readableSyncError(error) {
  const message = String(error?.message || error || "");
  if (/user_data|library_items|does not exist|schema cache|PGRST205/i.test(message)) {
    return "Falta concluir a configuração do Supabase. Execute o arquivo supabase/schema.sql.";
  }
  if (/failed to fetch|network|load failed|offline/i.test(message)) {
    return "Sem conexão com o Supabase. Tentaremos novamente automaticamente.";
  }
  if (/jwt|unauthorized|permission|row-level|policy|403|401/i.test(message)) {
    return "Sua sessão perdeu a permissão de sincronizar. Entre novamente na conta.";
  }
  return message || "Falha ao sincronizar com o Supabase.";
}

async function upsertValue(userId, key, value, updatedAt) {
  const { error } = await supabase.from("user_data").upsert({
    user_id: userId,
    data_key: key,
    value,
    updated_at: updatedAt
  }, { onConflict: "user_id,data_key" });
  if (error) throw error;
  markSynced(key, updatedAt);
}

async function reconcileAll(userId) {
  const { data, error } = await supabase
    .from("user_data")
    .select("data_key,value,updated_at")
    .in("data_key", SYNCED_STORAGE_KEYS);
  if (error) throw error;

  const cloudRows = new Map((data || []).map(row => [row.data_key, row]));
  for (const key of SYNCED_STORAGE_KEYS) {
    const localValue = readSyncedValue(key, null);
    const meta = getSyncMeta(key);
    const cloud = cloudRows.get(key);

    if (!cloud) {
      if (hasUsefulData(localValue)) {
        await upsertValue(userId, key, localValue, meta.updatedAt || new Date().toISOString());
      }
      continue;
    }

    if (!meta.updatedAt) {
      const merged = mergeFirstSync(localValue, cloud.value);
      if (JSON.stringify(merged) !== JSON.stringify(cloud.value)) {
        await upsertValue(userId, key, merged, new Date().toISOString());
        writeSyncedValue(key, merged, { source: "cloud", updatedAt: new Date().toISOString() });
      } else {
        writeSyncedValue(key, cloud.value, { source: "cloud", updatedAt: cloud.updated_at });
      }
      continue;
    }

    const localTime = Date.parse(meta.updatedAt) || 0;
    const cloudTime = Date.parse(cloud.updated_at) || 0;
    if (meta.pending && localTime > cloudTime) {
      await upsertValue(userId, key, localValue, meta.updatedAt);
    } else if (cloudTime > localTime || meta.pending) {
      writeSyncedValue(key, cloud.value, { source: "cloud", updatedAt: cloud.updated_at });
    } else {
      markSynced(key, cloud.updated_at);
    }
  }
}

export function useAccountSync(userId) {
  const [state, setState] = useState({ syncing: false, error: "", lastSyncedAt: "" });
  const queue = useRef(Promise.resolve());
  const userRef = useRef(userId);
  userRef.current = userId;

  const runQueued = useCallback(task => {
    queue.current = queue.current.then(async () => {
      if (!userRef.current || !supabase) return;
      setState(current => ({ ...current, syncing: true }));
      try {
        await task(userRef.current);
        setState({ syncing: false, error: "", lastSyncedAt: new Date().toISOString() });
      } catch (error) {
        setState(current => ({ ...current, syncing: false, error: readableSyncError(error) }));
      }
    });
    return queue.current;
  }, []);

  const retry = useCallback(() => runQueued(reconcileAll), [runQueued]);

  useEffect(() => {
    if (!userId || !supabase) {
      setState({ syncing: false, error: "", lastSyncedAt: "" });
      return undefined;
    }

    retry();
    const onChange = event => {
      const { key, value, updatedAt } = event.detail || {};
      if (!SYNCED_STORAGE_KEYS.includes(key)) return;
      runQueued(id => upsertValue(id, key, value, updatedAt));
    };
    const onReconnect = () => retry();
    window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
    window.addEventListener("online", onReconnect);
    window.addEventListener("focus", onReconnect);
    const interval = window.setInterval(retry, 30000);

    return () => {
      window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
      window.removeEventListener("online", onReconnect);
      window.removeEventListener("focus", onReconnect);
      window.clearInterval(interval);
    };
  }, [userId, retry, runQueued]);

  return { ...state, retry };
}
