import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const requestAllPermissions = async () => {
      const statuses = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
      ]);

      const denied: string[] = [];
      if (statuses[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED) {
        denied.push('📷 相機（拍照檢查詐騙訊息）');
      }
      if (statuses[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
        denied.push('🎙️ 麥克風（語音記帳與備忘）');
      }
      if (
        statuses[PermissionsAndroid.PERMISSIONS.READ_CALENDAR] !== PermissionsAndroid.RESULTS.GRANTED ||
        statuses[PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        denied.push('📅 行事曆（記錄重要日程）');
      }

      if (denied.length === 0) return;

      Alert.alert(
        '需要開啟授權',
        `為了讓 APP 正常運作，請允許以下權限：\n\n${denied.join('\n')}\n\n請點「前往設定」，再開啟所有權限。`,
        [
          { text: '前往設定', onPress: () => Linking.openSettings() },
          { text: '稍後再說', style: 'cancel' },
        ],
      );
    };
    requestAllPermissions();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerText}>銀髮守護者</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.button, styles.speakButton]}
          onPress={() => navigation.navigate('Recording')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>🎙️</Text>
          <Text style={styles.buttonTitle}>按住說話</Text>
          <Text style={styles.buttonSubtitle}>記帳・備忘・行事曆</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.scanButton]}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonTitle}>拍照檢查</Text>
          <Text style={styles.buttonSubtitle}>防詐騙・LINE・簡訊</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('History')}>
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={styles.tabText}>記錄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => BackHandler.exitApp()}>
          <Text style={styles.tabIcon}>🚪</Text>
          <Text style={styles.tabText}>退出</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={styles.tabText}>設定</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1b5e20',
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 80,
    justifyContent: 'center',
    gap: 28,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  speakButton: {
    backgroundColor: '#2e7d32',
  },
  scanButton: {
    backgroundColor: '#c62828',
  },
  buttonIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  buttonTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buttonSubtitle: {
    color: '#ffffff',
    fontSize: 22,
    opacity: 0.9,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 18,
    color: '#333',
  },
});
