const DB_NAME = 'si-raport-attendance';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'photoRef' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB tidak dapat dibuka.'));
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = String(dataUrl || '').split(',');
  if (!header || !encoded) return null;
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export async function saveAttendancePhoto({ dataUrl, logId, activityId, participantId, eventType, capturedAt }) {
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return null;
  if (!window.indexedDB) throw new Error('Browser tidak mendukung penyimpanan foto lokal.');

  const photoRef = `local-photo/${activityId}/${participantId}/${eventType}/${logId}`;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) throw new Error('Format foto dokumentasi tidak valid.');

  const database = await openPhotoDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      photoRef,
      logId,
      activityId,
      participantId,
      eventType,
      capturedAt: capturedAt || new Date().toISOString(),
      blob,
    });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Foto lokal gagal disimpan.'));
  });
  database.close();
  return photoRef;
}

export async function getAttendancePhoto(photoRef) {
  if (!photoRef || !window.indexedDB) return null;
  const database = await openPhotoDatabase();
  const record = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(photoRef);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Foto lokal gagal dibaca.'));
  });
  database.close();
  if (!record?.blob) return null;
  return URL.createObjectURL(record.blob);
}

export async function removeAttendancePhoto(photoRef) {
  if (!photoRef || !window.indexedDB) return;
  const database = await openPhotoDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(photoRef);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Foto lokal gagal dihapus.'));
  });
  database.close();
}
