// Robust IndexedDB helper for persistent large file and video storage
const DB_NAME = 'alpha_media_store';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window undefined'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaItem(id: string, dataUrlOrBlob: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, data: dataUrlOrBlob, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB save failed, falling back', e);
  }
}

export async function getMediaItem(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB get failed', e);
    return null;
  }
}

export async function deleteMediaItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB delete failed', e);
  }
}

// Universal resilient opener for heavy/light files & media
export async function openOrDownloadFile(file: { id?: string; fileUrl: string; title: string }) {
  if (!file || !file.fileUrl) return;
  try {
    if (file.fileUrl === 'indexeddb' && file.id) {
      const data = await getMediaItem(file.id);
      if (data) {
        if (data.startsWith('data:')) {
          const parts = data.split(';base64,');
          const contentType = parts[0].split(':')[1] || 'application/octet-stream';
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          return;
        }
        window.open(data, '_blank');
        return;
      }
    }

    if (file.fileUrl.startsWith('data:')) {
      const parts = file.fileUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'application/octet-stream';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    }

    window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('Failed to open file safely:', err);
    window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
  }
}

