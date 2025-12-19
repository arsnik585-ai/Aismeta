
export enum EntryType {
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR'
}

export interface Entry {
  id: string;
  projectId: string;
  type: EntryType;
  name: string;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  total: number | null;
  vendor: string | null;
  date: number;
  images?: string[]; // Массив строк base64
  voiceTranscript?: string;
  processed: boolean;
  archived?: boolean;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  archived?: boolean;
}

export interface SyncQueueItem {
  id: string;
  entryId: string;
  type: 'PHOTO' | 'VOICE';
  payload: string; // base64 или текст
}
