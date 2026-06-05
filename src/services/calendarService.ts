import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
// @ts-ignore
import RNCalendarEvents from 'react-native-calendar-events';

async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
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

    return (
      readGranted === PermissionsAndroid.RESULTS.GRANTED &&
      writeGranted === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  const status = await RNCalendarEvents.requestPermissions();
  return status === 'authorized';
}

export async function saveToCalendar(
  title: string,
  date: string,
  time: string,
): Promise<boolean> {
  const hasPermission = await requestCalendarPermission();
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

  await RNCalendarEvents.saveEvent(title, {
    startDate,
    endDate,
    allDay: isAllDay,
  });

  return true;
}
