import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
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
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>首頁</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('History')}>
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={styles.tabText}>記錄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => { Alert.alert('測試', '準備導航到設定'); navigation.navigate('Settings'); }}>
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
