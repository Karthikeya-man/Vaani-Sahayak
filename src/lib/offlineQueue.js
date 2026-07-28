const DB_NAME = 'VaaniOfflineDB';
const STORE_NAME = 'crop_scans';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingScan(scanData) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      id: scanData.id || `offline_scan_${Date.now()}`,
      crop: scanData.crop || 'Cotton',
      disease: scanData.disease || 'Cotton Leaf Curl Virus',
      district: scanData.district || 'Rajkot',
      image: scanData.image || null,
      created_at: new Date().toISOString()
    };
    store.put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] Failed to save scan to IndexedDB:', err);
    throw err;
  }
}

export async function getPendingScans() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Failed to read pending scans from IndexedDB:', err);
    return [];
  }
}

export async function removePendingScan(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] Failed to delete scan from IndexedDB:', err);
  }
}

export async function syncPendingScans() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0 };
  const pending = await getPendingScans();
  if (pending.length === 0) return { synced: 0 };

  let count = 0;
  for (const scan of pending) {
    try {
      const res = await fetch('/api/crop-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan)
      });
      if (res.ok) {
        await removePendingScan(scan.id);
        count++;
      }
    } catch (e) {
      console.warn('[OfflineQueue] Sync failed for scan ID:', scan.id, e.message);
    }
  }
  return { synced: count };
}
