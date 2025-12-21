
import { Project, Entry } from './types';

const DB_NAME = 'SmetaDB';
const DB_VERSION = 1;

export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('entries')) {
        const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
        entryStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveProject = async (project: Project) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const data = { ...project, archived: !!project.archived };
    tx.objectStore('projects').put(data);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteProject = async (projectId: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'entries'], 'readwrite');
    const entryStore = tx.objectStore('entries');
    const index = entryStore.index('projectId');
    const request = index.openCursor(IDBKeyRange.only(projectId));
    request.onsuccess = (event: any) => {
      const cursor = (event.target as any).result;
      if (cursor) {
        entryStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.objectStore('projects').delete(projectId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getProjects = async (showArchived = false): Promise<Project[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const request = tx.objectStore('projects').getAll();
    request.onsuccess = () => {
      const all = request.result as Project[];
      const filtered = all.filter(p => (!!p.archived) === showArchived);
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveEntry = async (entry: Entry) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put({ ...entry, archived: !!entry.archived });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteEntry = async (id: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getEntriesByProject = async (projectId: string, showArchived = false): Promise<Entry[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const index = tx.objectStore('entries').index('projectId');
    const request = index.getAll(IDBKeyRange.only(projectId));
    request.onsuccess = () => {
      const all = request.result as Entry[];
      resolve(all.filter(e => (!!e.archived) === showArchived));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getFullProjectData = async (projectId: string) => {
  const db = await initDB();
  const projectRequest = new Promise<Project>((resolve) => {
    const tx = db.transaction('projects', 'readonly');
    const req = tx.objectStore('projects').get(projectId);
    req.onsuccess = () => resolve(req.result);
  });
  
  const entries = await getEntriesByProject(projectId, false);
  const archivedEntries = await getEntriesByProject(projectId, true);
  const project = await projectRequest;
  
  return { project, entries: [...entries, ...archivedEntries] };
};
