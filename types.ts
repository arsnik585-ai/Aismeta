
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
  date: number;
  images?: string[]; // Array of base64 strings
  archived?: boolean;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  archived?: boolean;
}
