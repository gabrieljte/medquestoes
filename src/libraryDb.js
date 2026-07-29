const DATABASE_NAME = "medquestoes-library";
const DATABASE_VERSION = 1;
const IMAGE_STORE = "images";

let databasePromise;

function getIndexedDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("O banco de imagens não está disponível neste navegador.");
  }

  return indexedDB;
}

export function openLibraryDb() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    let request;

    try {
      request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      databasePromise = undefined;
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(IMAGE_STORE)
        ? request.transaction.objectStore(IMAGE_STORE)
        : database.createObjectStore(IMAGE_STORE, { keyPath: "id" });

      if (!store.indexNames.contains("area")) {
        store.createIndex("area", "area", { unique: false });
      }

      if (!store.indexNames.contains("createdAt")) {
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };

      resolve(database);
    };

    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error || new Error("Não foi possível abrir a biblioteca."));
    };

    request.onblocked = () => {
      databasePromise = undefined;
      reject(new Error("Feche outras abas do aplicativo e tente novamente."));
    };
  });

  return databasePromise;
}

async function runRequest(mode, createRequest) {
  const database = await openLibraryDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, mode);
    const store = transaction.objectStore(IMAGE_STORE);
    let request;
    let result;

    try {
      request = createRequest(store);
    } catch (error) {
      reject(error);
      return;
    }

    request.onsuccess = () => {
      result = request.result;
    };

    request.onerror = () => {
      reject(request.error || new Error("Não foi possível acessar a biblioteca."));
    };

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => {
      reject(transaction.error || new Error("Não foi possível atualizar a biblioteca."));
    };
    transaction.onabort = () => {
      reject(transaction.error || new Error("A atualização da biblioteca foi cancelada."));
    };
  });
}

export async function listLibraryImages() {
  const records = await runRequest("readonly", store => store.getAll());

  return [...(records || [])].sort((first, second) =>
    String(second.createdAt || "").localeCompare(String(first.createdAt || ""))
  );
}

export async function saveLibraryImage(record) {
  if (!record?.id || !record?.area || !(record?.image instanceof Blob)) {
    throw new Error("Os dados da imagem estão incompletos.");
  }

  await runRequest("readwrite", store => store.put(record));
  return record;
}

export async function deleteLibraryImage(id) {
  if (!id) return;
  await runRequest("readwrite", store => store.delete(id));
}

