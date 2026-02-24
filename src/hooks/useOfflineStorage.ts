import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const DB_NAME = 'juntoo-offline';
const STORE_NAME = 'query-cache';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

const saveToIDB = async (key: string, data: unknown) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, data, timestamp: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Failed to save offline data:', e);
  }
};

const loadFromIDB = async (key: string): Promise<unknown | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);
        // Expire after 24h
        if (Date.now() - result.timestamp > 24 * 60 * 60 * 1000) return resolve(null);
        resolve(result.data);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// Keys to persist offline
const OFFLINE_KEYS = ['events', 'trending-events', 'recommended-events'];

/**
 * Hook that persists critical query data to IndexedDB for offline access.
 */
export const useOfflineStorage = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // On mount, hydrate from IndexedDB
    const hydrate = async () => {
      for (const key of OFFLINE_KEYS) {
        const data = await loadFromIDB(key);
        if (data) {
          queryClient.setQueryData([key], data);
        }
      }
    };
    hydrate();

    // Periodically save query data to IndexedDB
    const interval = setInterval(() => {
      for (const key of OFFLINE_KEYS) {
        const data = queryClient.getQueryData([key]);
        if (data) {
          saveToIDB(key, data);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Save on visibility change (user leaving app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        for (const key of OFFLINE_KEYS) {
          const data = queryClient.getQueryData([key]);
          if (data) {
            saveToIDB(key, data);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);
};
