import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { getRecords, deleteRecord } from '../services/storageService';
import type { AppRecord } from '../services/storageService';

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

const TYPE_ICON: Record<AppRecord['type'], string> = {
  expense: '💰',
  memo: '📝',
  calendar: '📅',
};

const TYPE_LABEL: Record<AppRecord['type'], string> = {
  expense: '記帳',
  memo: '備忘',
  calendar: '行事曆',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HistoryScreen({ navigation }: Props) {
  const [records, setRecords] = useState<AppRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecords().then(setRecords);
    }, []),
  );

  const handleDelete = (id: string, summary: string) => {
    Alert.alert(
      '刪除記錄',
      `確定要刪除「${summary}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            await deleteRecord(id);
            setRecords(prev => prev.filter(r => r.id !== id));
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: AppRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.typeIcon}>{TYPE_ICON[item.type]}</Text>
      </View>

      <View style={styles.cardMiddle}>
        <View style={styles.cardHeader}>
          <Text style={styles.typeLabel}>{TYPE_LABEL[item.type]}</Text>
          <Text style={styles.createdAt}>{formatTime(item.createdAt)}</Text>
        </View>

        <Text style={styles.summary}>{item.summary}</Text>

        {item.type === 'expense' && (
          <Text style={styles.detail}>
            {item.category ?? '其他'}　${item.amount ?? '?'} 元
          </Text>
        )}
        {item.type === 'calendar' && (item.date || item.time) && (
          <Text style={styles.detail}>
            {[item.date, item.time].filter(Boolean).join('  ')}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.summary)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>我的記錄</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>尚無記錄</Text>
            <Text style={styles.emptySubText}>說話或拍照後，記錄會出現在這裡</Text>
          </View>
        ) : (
          records.map(item => (
            <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>
          ))
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>首頁</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabText, styles.tabTextActive]}>記錄</Text>
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
    backgroundColor: '#f0f4f0',
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
  listContent: {
    padding: 16,
    paddingBottom: 88,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    paddingBottom: 72,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 72,
  },
  emptyText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#555',
  },
  emptySubText: {
    fontSize: 20,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  cardLeft: {
    marginRight: 16,
  },
  typeIcon: {
    fontSize: 44,
  },
  cardMiddle: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5e20',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  createdAt: {
    fontSize: 16,
    color: '#999',
  },
  summary: {
    fontSize: 24,
    color: '#222',
    fontWeight: '600',
    lineHeight: 34,
  },
  detail: {
    fontSize: 20,
    color: '#555',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  deleteIcon: {
    fontSize: 28,
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
  tabActive: {
    borderTopWidth: 3,
    borderTopColor: '#1b5e20',
  },
  tabIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 18,
    color: '#333',
  },
  tabTextActive: {
    color: '#1b5e20',
    fontWeight: 'bold',
  },
});
