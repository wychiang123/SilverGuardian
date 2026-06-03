import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'silver_guardian_records';

export interface AppRecord {
  id: string;
  type: 'expense' | 'memo' | 'calendar';
  content?: string;
  amount?: number;
  category?: string;
  date?: string;
  time?: string;
  summary: string;
  createdAt: string;
}

export async function saveRecord(record: Omit<AppRecord, 'id'>): Promise<void> {
  const existing = await getRecords();
  const newRecord: AppRecord = { ...record, id: Date.now().toString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...existing]));
}

export async function getRecords(): Promise<AppRecord[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  const records = JSON.parse(data) as AppRecord[];
  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function deleteRecord(id: string): Promise<void> {
  const existing = await getRecords();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter(r => r.id !== id)),
  );
}
