import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const MAX_EMAILS = 3;
const STORAGE_KEY = 'family_emails';

export default function SettingsScreen({ navigation }: Props) {
  const [emails, setEmails] = useState<string[]>(['', '', '']);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);

  const loadEmails = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: string[] = JSON.parse(raw);
      setSavedEmails(stored);
      const filled = [...stored, '', '', ''].slice(0, MAX_EMAILS);
      setEmails(filled);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEmails();
    }, [loadEmails]),
  );

  const handleSave = async () => {
    const valid = emails
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const invalid = valid.filter(e => !e.includes('@') || !e.includes('.'));
    if (invalid.length > 0) {
      Alert.alert('格式錯誤', `以下 Email 格式不正確：\n${invalid.join('\n')}`);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    setSavedEmails(valid);
    Alert.alert('✅ 儲存成功', valid.length > 0
      ? `已設定 ${valid.length} 個家人 Email`
      : '已清除所有 Email 設定',
    );
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧 家人通知 Email</Text>
            <Text style={styles.sectionDesc}>
              偵測到詐騙時，自動寄通知給以下家人{'\n'}（最多可設定 {MAX_EMAILS} 個）
            </Text>

            {Array.from({ length: MAX_EMAILS }).map((_, i) => (
              <View key={i} style={styles.inputRow}>
                <Text style={styles.inputLabel}>家人 {i + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={emails[i]}
                  onChangeText={v => updateEmail(i, v)}
                  placeholder="請輸入 Email"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>💾 儲存設定</Text>
            </TouchableOpacity>
          </View>

          {savedEmails.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ 已設定的家人 Email</Text>
              {savedEmails.map((email, i) => (
                <View key={i} style={styles.savedRow}>
                  <Text style={styles.savedIndex}>{i + 1}.</Text>
                  <Text style={styles.savedEmail}>{email}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>首頁</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1b5e20',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 64,
  },
  backText: {
    color: '#ffffff',
    fontSize: 26,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  headerSpacer: {
    minWidth: 64,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
    gap: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  sectionDesc: {
    fontSize: 20,
    color: '#666',
    lineHeight: 30,
  },
  inputRow: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#c8e6c9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    color: '#222',
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 3,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  savedIndex: {
    fontSize: 22,
    color: '#888',
    minWidth: 28,
  },
  savedEmail: {
    fontSize: 22,
    color: '#333',
    flex: 1,
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
