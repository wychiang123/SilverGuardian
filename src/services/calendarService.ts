import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
// @ts-ignore
import RNCalendarEvents from 'react-native-calendar-events';

async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Step 1: check current status — avoids unnecessary dialog
    const readCheck = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
    );
    const writeCheck = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
    );
    console.log('[Calendar] check READ_CALENDAR:', readCheck, '| WRITE_CALENDAR:', writeCheck);

    if (readCheck && writeCheck) {
      console.log('[Calendar] 行事曆權限已授權，跳過請求');
      return true;
    }

    // Step 2: not granted — request
    console.log('[Calendar] 行事曆權限不足，開始請求...');
    const readGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
      {
        title: '需要行事曆權限',
        message: '寫入手機行事曆需要此權限',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    console.log('[Calendar] READ_CALENDAR 請求結果:', readGranted);

    const writeGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
      {
        title: '需要行事曆權限',
        message: '寫入手機行事曆需要此權限',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    console.log('[Calendar] WRITE_CALENDAR 請求結果:', writeGranted);

    if (
      readGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
      writeGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ) {
      console.log('[Calendar] 權限被永久拒絕 (NEVER_ASK_AGAIN)');
      Alert.alert(
        '需要行事曆權限',
        '行事曆權限已被拒絕，無法寫入日程。請點「前往設定」，再開啟行事曆權限。',
        [
          { text: '前往設定', onPress: () => Linking.openSettings() },
          { text: '取消', style: 'cancel' },
        ],
      );
      return false;
    }

    const granted =
      readGranted === PermissionsAndroid.RESULTS.GRANTED &&
      writeGranted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('[Calendar] 最終授權結果:', granted);
    return granted;
  }

  // iOS
  const status = await RNCalendarEvents.requestPermissions();
  console.log('[Calendar] iOS requestPermissions 結果:', status);
  return status === 'authorized';
}

export async function saveToCalendar(
  title: string,
  date: string,
  time: string,
): Promise<boolean> {
  console.log('[Calendar] saveToCalendar 開始 | title:', title, '| date:', date, '| time:', time);

  const hasPermission = await requestCalendarPermission();
  console.log('[Calendar] 權限確認結果:', hasPermission);

  if (!hasPermission) {
    console.log('[Calendar] 無行事曆權限，取消寫入');
    return false;
  }

  const isAllDay = !time || time === '未指定';
  console.log('[Calendar] isAllDay:', isAllDay);

  let startDate: string;
  let endDate: string;

  if (isAllDay) {
    startDate = `${date}T00:00:00.000Z`;
    endDate = `${date}T23:59:59.000Z`;
  } else {
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    startDate = start.toISOString();
    endDate = end.toISOString();
  }

  console.log('[Calendar] startDate:', startDate, '| endDate:', endDate);

  try {
    const result = await RNCalendarEvents.saveEvent(title, {
      startDate,
      endDate,
      allDay: isAllDay,
    });
    console.log('[Calendar] saveEvent 成功 | result:', result);
    return true;
  } catch (err) {
    console.error('[Calendar] saveEvent 失敗:', err);
    throw err;
  }
}
