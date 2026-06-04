import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_LIMIT = 99;

function getTodayKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `rate_limit_${yyyy}-${mm}-${dd}`;
}

export async function checkRateLimit(): Promise<void> {
  const key = getTodayKey();
  const stored = await AsyncStorage.getItem(key);
  const count = stored ? parseInt(stored, 10) : 0;

  if (count >= DAILY_LIMIT) {
    throw new Error('今日使用次數已達上限，請明天再試！');
  }

  await AsyncStorage.setItem(key, String(count + 1));
}

export async function getRemainingCount(): Promise<number> {
  const key = getTodayKey();
  const stored = await AsyncStorage.getItem(key);
  const count = stored ? parseInt(stored, 10) : 0;
  return Math.max(0, DAILY_LIMIT - count);
}
