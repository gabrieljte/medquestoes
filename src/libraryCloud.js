import { supabase } from "./supabase.js";
import { deleteLibraryImage, listLibraryImages, saveLibraryImage } from "./libraryDb.js";

const BUCKET = "library-images";
const DELETE_QUEUE = "medquestoes-library-delete-queue";

function cloudRecord(record, userId, storagePath) {
  return {
    user_id: userId,
    id: String(record.id),
    area: record.area,
    description: record.description || "",
    file_name: record.fileName || "arquivo",
    mime_type: record.mimeType || record.image?.type || "image/jpeg",
    size: record.size || record.image?.size || 0,
    storage_path: storagePath,
    created_at: record.createdAt || new Date().toISOString(),
    updated_at: record.updatedAt || new Date().toISOString(),
    deleted_at: null
  };
}

function readDeleteQueue() {
  try {
    const value = JSON.parse(localStorage.getItem(DELETE_QUEUE) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeDeleteQueue(value) {
  localStorage.setItem(DELETE_QUEUE, JSON.stringify(value));
}

export function queueLibraryDeletion(item) {
  const queue = readDeleteQueue();
  if (!queue.some(entry => String(entry.id) === String(item.id))) {
    writeDeleteQueue([...queue, { id: String(item.id), storagePath: item.storagePath || "" }]);
  }
}

export async function uploadLibraryImage(record, userId) {
  if (!supabase || !userId) return record;
  const extension = String(record.fileName || "arquivo.bin").split(".").pop().replace(/[^a-z0-9]/gi, "") || "bin";
  const path = `${userId}/${record.id}.${extension}`;
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, record.image, { contentType: record.mimeType, upsert: true });
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("library_items")
    .upsert(cloudRecord(record, userId, path), { onConflict: "user_id,id" });
  if (error) throw error;
  return { ...record, storagePath: path, metadataPending: false };
}

export async function updateLibraryMetadata(record, userId) {
  if (!supabase || !userId) return record;
  if (!record.storagePath) return uploadLibraryImage(record, userId);
  const { error } = await supabase.from("library_items")
    .upsert(cloudRecord(record, userId, record.storagePath), { onConflict: "user_id,id" });
  if (error) throw error;
  return { ...record, metadataPending: false };
}

async function flushDeletions(userId) {
  const queue = readDeleteQueue();
  if (!queue.length) return;
  for (const item of queue) {
    const { error } = await supabase.from("library_items").upsert({
      user_id: userId,
      id: String(item.id),
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,id" });
    if (error) throw error;
    if (item.storagePath) await supabase.storage.from(BUCKET).remove([item.storagePath]);
  }
  writeDeleteQueue([]);
}

export async function deleteCloudLibraryImage(item, userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("library_items").upsert({
    user_id: userId,
    id: String(item.id),
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,id" });
  if (error) throw error;
  if (item.storagePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storagePath]);
    if (storageError) throw storageError;
  }
}

export async function syncLibraryImages(userId) {
  if (!supabase || !userId) return listLibraryImages();
  await flushDeletions(userId);

  const local = await listLibraryImages();
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const cloudById = new Map((data || []).map(row => [String(row.id), row]));
  for (const record of local) {
    const cloud = cloudById.get(String(record.id));
    if (cloud?.deleted_at) {
      await deleteLibraryImage(record.id);
    } else if (!cloud) {
      const uploaded = await uploadLibraryImage(record, userId);
      await saveLibraryImage(uploaded);
      cloudById.set(String(record.id), cloudRecord(uploaded, userId, uploaded.storagePath));
    } else if (record.metadataPending && String(record.updatedAt || "") > String(cloud.updated_at || "")) {
      await saveLibraryImage(await updateLibraryMetadata({ ...record, storagePath: cloud.storage_path }, userId));
    } else {
      await saveLibraryImage({ ...record, area: cloud.area, description: cloud.description || "", storagePath: cloud.storage_path, updatedAt: cloud.updated_at, metadataPending: false });
    }
  }

  const refreshedLocal = await listLibraryImages();
  const localIds = new Set(refreshedLocal.map(record => String(record.id)));
  for (const row of data || []) {
    if (row.deleted_at || localIds.has(String(row.id)) || !row.storage_path) continue;
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(row.storage_path);
    if (downloadError) throw downloadError;
    await saveLibraryImage({
      id: String(row.id),
      area: row.area,
      description: row.description || "",
      image: blob,
      fileName: row.file_name || "arquivo",
      mimeType: row.mime_type || blob.type,
      size: row.size || blob.size,
      storagePath: row.storage_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
  return listLibraryImages();
}
