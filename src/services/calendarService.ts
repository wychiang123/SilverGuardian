import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
// @ts-ignore
import RNCalendarEvents from 'react-native-calendar-events';

// Debug helper — wraps Alert in a Promise so each popup blocks until user taps OK
function alertAsync(title: string, message: string): Promise<void> {
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: 'OK', onPress: resolve }]);
  });
}

async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Step 1: check current status
    const readCheck = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
    );
    const writeCheck = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
    );
    await alertAsync(
      '[Debug] 步驟1：權限現況',
      `READ_CALENDAR: ${readCheck}\nWRITE_CALENDAR: ${writeCheck}`,
    );

    if (readCheck && writeCheck) {
      return true;
    }

    // Step 2: not granted — request
    const readGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
      {
        title: '需要行事曆權限',
        message: '寫入手機行事曆需要此權限',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    const writeGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
      {
        title: '需要行事曆權限',
        message: '寫入手機行事曆需要此權限',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    await alertAsync(
      '[Debug] 步驟2：權限請求結果',
      `READ_CALENDAR: ${readGranted}\nWRITE_CALENDAR: ${writeGranted}`,
    );

    if (
      readGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
      writeGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ) {
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
    return granted;
  }

  // iOS
  const status = await RNCalendarEvents.requestPermissions();
  await alertAsync('[Debug] iOS 權限結果', `status: ${status}`);
  return status === 'authorized';
}

export async function saveToCalendar(
  title: string,
  date: string,
  time: string,
): Promise<boolean> {
  const hasPermission = await requestCalendarPermission();
  await alertAsync(
    '[Debug] 步驟3：權限確認',
    `hasPermission: ${hasPermission}`,
  );

  if (!hasPermission) {
    return false;
  }

  const isAllDay = !time || time === '未指定';

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

  await alertAsync(
    '[Debug] 步驟4：即將寫入行事曆',
    `title: ${title}\nstartDate: ${startDate}\nendDate: ${endDate}\nallDay: ${isAllDay}`,
  );

  try {
    const result = await RNCalendarEvents.saveEvent(title, {
      startDate,
      endDate,
      allDay: isAllDay,
      alarms: [
        { date: -180 }, // 事件前 3 小時
        { date: -30 },  // 事件前 30 分鐘
        { date: 0 },    // 事件開始時
      ],
    });
    await alertAsync(
      '[Debug] 步驟5：saveEvent 成功',
      `result: ${JSON.stringify(result)}`,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error
      ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}`
      : JSON.stringify(err);
    await alertAsync('[Debug] 步驟5：saveEvent 失敗', msg);
    throw err;
  }
}
