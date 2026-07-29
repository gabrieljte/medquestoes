const DB_NAME = "medquestoes-db";
const DB_VERSION = 2;
const STORE = "questions";
const ATTEMPTS_STORE = "attempts";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("area", "area");
        store.createIndex("topic", "topic");
        store.createIndex("difficulty", "difficulty");
      }
      if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
        const attempts = db.createObjectStore(ATTEMPTS_STORE, { keyPath: "id" });
        attempts.createIndex("area", "area");
        attempts.createIndex("answeredAt", "answeredAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, operation, storeName = STORE) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    operation(store);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  }));
}

export async function loadQuestions(seedQuestions) {
  const db = await openDatabase();
  const stored = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();

  if (stored.length) {
    const merged = [...new Map(
      [...seedQuestions, ...stored].map(question => [String(question.id), question])
    ).values()];
    if (merged.length !== stored.length) await saveQuestions(merged);
    return merged;
  }

  const legacy = JSON.parse(localStorage.getItem("medquestoes-user") || "[]");
  const initial = [...seedQuestions, ...legacy];
  await saveQuestions(initial);
  localStorage.removeItem("medquestoes-user");
  return initial;
}

export function saveQuestions(questions) {
  return runTransaction("readwrite", store => {
    questions.forEach(question => store.put(question));
  });
}

export function clearQuestionDatabase() {
  return runTransaction("readwrite", store => store.clear());
}

export function saveAttempt(attempt) {
  return runTransaction("readwrite", store => store.put(attempt), ATTEMPTS_STORE);
}

export async function loadAttempts() {
  const db = await openDatabase();
  const attempts = await new Promise((resolve, reject) => {
    const request = db.transaction(ATTEMPTS_STORE, "readonly").objectStore(ATTEMPTS_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return attempts;
}

export function saveAttempts(attempts) {
  return runTransaction("readwrite", store => {
    attempts.forEach(attempt => store.put(attempt));
  }, ATTEMPTS_STORE);
}
