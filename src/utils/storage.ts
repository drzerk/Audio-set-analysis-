import { TechnoSetAnalysis, TrackLibraryItem } from '../types';
import { DEMO_SETS } from '../data/demoSets';
import { DEFAULT_TRACK_LIBRARY } from '../data/trackLibrary';

const DB_NAME = 'TechnoSetAnalyzerDB';
const DB_VERSION = 1;
const STORE_NAME = 'techno_sets';

// IndexedDB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalSets(): Promise<TechnoSetAnalysis[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const stored = request.result as TechnoSetAnalysis[];
        if (!stored || stored.length === 0) {
          // Initialize with DEMO_SETS if fresh install
          saveInitialDemoSets().then(resolve);
        } else {
          resolve(stored);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back to LocalStorage', err);
    const fallback = localStorage.getItem('techno_sets_backup');
    if (fallback) {
      try {
        return JSON.parse(fallback);
      } catch {
        return DEMO_SETS;
      }
    }
    return DEMO_SETS;
  }
}

async function saveInitialDemoSets(): Promise<TechnoSetAnalysis[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const set of DEMO_SETS) {
      store.put(set);
    }
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  } catch (err) {
    console.error('Error saving initial demo sets', err);
  }
  return DEMO_SETS;
}

export async function saveLocalSet(set: TechnoSetAnalysis): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(set);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // Also backup summary in localStorage for safety
    const brief = { id: set.id, name: set.name, updatedAt: set.updatedAt };
    localStorage.setItem(`set_brief_${set.id}`, JSON.stringify(brief));
  } catch (err) {
    console.error('Failed to save to IndexedDB', err);
  }
}

export async function deleteLocalSet(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete from IndexedDB', err);
  }
}

// Cloud Synchronization
export async function syncSetToCloud(set: TechnoSetAnalysis): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  try {
    const response = await fetch('/api/cloud-sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: set.id,
        name: set.name,
        duration: set.duration,
        bpmAverage: set.bpmAverage,
        keyCamelot: set.dominantKey,
        transitionScoreAvg: Math.round(
          set.transitions.reduce((acc, t) => acc + t.qualityScore, 0) / (set.transitions.length || 1)
        ),
        peakCount: set.peakMoments.length,
        data: set
      })
    });

    const data = await response.json();
    if (data.success) {
      set.isCloudSynced = true;
      set.updatedAt = data.record?.updatedAt || new Date().toISOString();
      await saveLocalSet(set);
      return { success: true, updatedAt: set.updatedAt };
    } else {
      return { success: false, error: data.error || 'Server lehnte Speicherung ab.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Offline: Verbindung zum Server nicht möglich.' };
  }
}

export async function fetchCloudSetList(): Promise<any[]> {
  try {
    const res = await fetch('/api/cloud-sync/list');
    const data = await res.json();
    return data.sets || [];
  } catch (err) {
    console.warn('Could not fetch cloud sets:', err);
    return [];
  }
}

export async function loadSetFromCloud(id: string): Promise<TechnoSetAnalysis | null> {
  try {
    const res = await fetch(`/api/cloud-sync/${id}`);
    const data = await res.json();
    if (data.success && data.record?.data) {
      const set = data.record.data as TechnoSetAnalysis;
      await saveLocalSet(set);
      return set;
    }
    return null;
  } catch (err) {
    console.error('Failed to load from cloud:', err);
    return null;
  }
}

// User Track Library Storage
const TRACK_LIB_KEY = 'techno_dj_track_library_v1';

export async function getUserTrackLibrary(): Promise<TrackLibraryItem[]> {
  try {
    const raw = localStorage.getItem(TRACK_LIB_KEY);
    if (!raw) {
      localStorage.setItem(TRACK_LIB_KEY, JSON.stringify(DEFAULT_TRACK_LIBRARY));
      return DEFAULT_TRACK_LIBRARY;
    }
    const parsed = JSON.parse(raw) as TrackLibraryItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TRACK_LIBRARY;
    }
    return parsed;
  } catch (err) {
    console.warn('Could not read track library from localStorage:', err);
    return DEFAULT_TRACK_LIBRARY;
  }
}

export async function saveUserTrackItem(track: TrackLibraryItem): Promise<TrackLibraryItem[]> {
  try {
    const library = await getUserTrackLibrary();
    const existingIndex = library.findIndex((t) => t.id === track.id);
    let updated: TrackLibraryItem[];
    if (existingIndex >= 0) {
      updated = [...library];
      updated[existingIndex] = track;
    } else {
      updated = [track, ...library];
    }
    localStorage.setItem(TRACK_LIB_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving user track item:', err);
    return DEFAULT_TRACK_LIBRARY;
  }
}

export async function deleteUserTrackItem(trackId: string): Promise<TrackLibraryItem[]> {
  try {
    const library = await getUserTrackLibrary();
    const updated = library.filter((t) => t.id !== trackId);
    localStorage.setItem(TRACK_LIB_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error deleting track from library:', err);
    return DEFAULT_TRACK_LIBRARY;
  }
}

export async function resetUserTrackLibrary(): Promise<TrackLibraryItem[]> {
  try {
    localStorage.setItem(TRACK_LIB_KEY, JSON.stringify(DEFAULT_TRACK_LIBRARY));
    return DEFAULT_TRACK_LIBRARY;
  } catch {
    return DEFAULT_TRACK_LIBRARY;
  }
}
