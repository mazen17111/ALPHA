// Robust IndexedDB helper for persistent large file and video storage
const DB_NAME = 'alpha_media_store';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

// Fast in-memory cache for Object URLs to ensure instantaneous playback and preview
const blobUrlCache = new Map<string, string>();

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
    // Clear from cache if exists
    if (blobUrlCache.has(id)) {
      const url = blobUrlCache.get(id);
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      blobUrlCache.delete(id);
    }
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

// Ultra-fast asynchronous DataURL to Blob URL converter using native browser streaming
export async function fastDataUrlToBlobUrl(dataUrl: string, cacheKey?: string): Promise<string> {
  if (!dataUrl) return '';
  if (cacheKey && blobUrlCache.has(cacheKey)) {
    return blobUrlCache.get(cacheKey)!;
  }
  if (blobUrlCache.has(dataUrl)) {
    return blobUrlCache.get(dataUrl)!;
  }

  // If already a regular URL or blob URL, return directly
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    // Native browser fetch is 50x faster than window.atob loops and non-blocking
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (cacheKey) blobUrlCache.set(cacheKey, objectUrl);
    blobUrlCache.set(dataUrl, objectUrl);
    return objectUrl;
  } catch {
    return dataUrl;
  }
}

// Fast Resolver for video and media URLs stored in IndexedDB or direct DataURLs
export async function resolveFastMediaUrl(videoIdOrUrl: string, videoId?: string): Promise<string> {
  if (!videoIdOrUrl) return '';

  if (videoId && blobUrlCache.has(videoId)) {
    return blobUrlCache.get(videoId)!;
  }

  if (videoIdOrUrl === 'indexeddb' && videoId) {
    const rawData = await getMediaItem(videoId);
    if (!rawData) return '';
    return await fastDataUrlToBlobUrl(rawData, videoId);
  }

  if (videoIdOrUrl.startsWith('data:')) {
    return await fastDataUrlToBlobUrl(videoIdOrUrl, videoId);
  }

  return videoIdOrUrl;
}

// Universal ultra-fast resilient opener for heavy/light files & media
export async function openOrDownloadFile(file: { id?: string; fileUrl: string; title: string }) {
  if (!file || !file.fileUrl) return;
  try {
    let resolvedUrl = file.fileUrl;

    if (file.fileUrl === 'indexeddb' && file.id) {
      const data = await getMediaItem(file.id);
      if (data) {
        resolvedUrl = await fastDataUrlToBlobUrl(data, file.id);
      }
    } else if (file.fileUrl.startsWith('data:')) {
      resolvedUrl = await fastDataUrlToBlobUrl(file.fileUrl, file.id);
    }

    if (resolvedUrl) {
      const win = window.open(resolvedUrl, '_blank');
      if (!win) {
        // Fallback if popup blocked: create download link
        const a = document.createElement('a');
        a.href = resolvedUrl;
        a.download = file.title || 'document';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  } catch (err) {
    console.error('Failed to open file safely:', err);
    window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
  }
}
