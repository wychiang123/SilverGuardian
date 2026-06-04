import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { notifyFamily } from '../services/notifyService';

type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface Props {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}

type NotifyStatus = 'sending' | 'sent' | 'failed' | 'no_contacts';

type RiskLevel = '高風險' | '中風險' | '低風險' | '資訊不足';

const RISK_CONFIG: Record<RiskLevel, {
  headerBg: string;
  bodyBg: string;
  accent: string;
  icon: string;
  label: string;
}> = {
  '高風險': { headerBg: '#b71c1c', bodyBg: '#fff8f8', accent: '#c62828', icon: '🚨', label: '高風險' },
  '中風險': { headerBg: '#bf360c', bodyBg: '#fff8f0', accent: '#e65100', icon: '⚠️', label: '中風險' },
  '低風險': { headerBg: '#1b5e20', bodyBg: '#f1f8e9', accent: '#2e7d32', icon: '✅', label: '低風險' },
  '資訊不足': { headerBg: '#424242', bodyBg: '#f5f5f5', accent: '#616161', icon: '❓', label: '資訊不足' },
};

const NOTIFY_LABEL: Record<NotifyStatus, string> = {
  sending: '📨 通知發送中...',
  sent: '✅ 已發送通知給家人',
  failed: '❌ 通知發送失敗',
  no_contacts: '⚠️ 尚未設定家人 Email',
};

export default function ResultScreen({ navigation, route }: Props) {
  const { riskLevel, finalScore, confidence, needHumanReview, evidenceHigh, evidenceLow, explanation, conclusion } = route.params;
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>('sending');

  const cfg = RISK_CONFIG[riskLevel] ?? RISK_CONFIG['資訊不足'];
  const isHighRisk = riskLevel === '高風險';

  useEffect(() => {
    if (!isHighRisk) return;
    notifyFamily(explanation, conclusion)
      .then(sent => setNotifyStatus(sent ? 'sent' : 'no_contacts'))
      .catch((error: { message?: string; response?: { status?: number; data?: unknown } }) => {
        setNotifyStatus('failed');
        const status = error.response?.status ?? 'N/A';
        const data = JSON.stringify(error.response?.data) ?? error.message ?? '無詳細資訊';
        Alert.alert('通知發送失敗', `status: ${status}\n\n${data}`);
      });
  }, [isHighRisk, explanation, conclusion]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.bodyBg }]}>
      <StatusBar backgroundColor={cfg.headerBg} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: cfg.headerBg }]}>
        <Text style={styles.riskIcon}>{cfg.icon}</Text>
        <Text style={styles.riskLabel}>{cfg.label}</Text>
        <Text style={styles.riskScore}>風險分數：{finalScore} / 100</Text>
        <Text style={styles.confidenceText}>AI 信心度：{confidence}%</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {confidence < 50 && (
          <View style={styles.lowConfidenceBox}>
            <Text style={styles.lowConfidenceTitle}>⚠️ AI 目前無法確認</Text>
            <Text style={styles.lowConfidenceItem}>• 請勿匯款或轉帳給陌生人</Text>
            <Text style={styles.lowConfidenceItem}>• 請勿提供個人資料或驗證碼</Text>
            <Text style={styles.lowConfidenceItem}>• 請與家人或親友討論確認</Text>
            <Text style={styles.lowConfidenceItem}>• 直接聯絡官方客服查證</Text>
          </View>
        )}

        {needHumanReview && (
          <View style={styles.humanReviewBox}>
            <Text style={styles.humanReviewText}>🧑‍⚖️ 建議人工確認</Text>
            <Text style={styles.humanReviewSub}>AI 判斷有不確定性，建議請家人或專業人士再確認</Text>
          </View>
        )}

        {isHighRisk && (
          <View style={[styles.notifyBox, { backgroundColor: cfg.headerBg }]}>
            <Text style={styles.notifyText}>{NOTIFY_LABEL[notifyStatus]}</Text>
          </View>
        )}

        {evidenceHigh.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#c62828' }]}>🔴 支持高風險的證據</Text>
            {evidenceHigh.map((item, i) => (
              <Text key={i} style={styles.evidenceItem}>• {item}</Text>
            ))}
          </View>
        )}

        {evidenceLow.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#2e7d32' }]}>🟢 支持低風險的證據</Text>
            {evidenceLow.map((item, i) => (
              <Text key={i} style={styles.evidenceItem}>• {item}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 分析說明</Text>
          <Text style={styles.bodyText}>{explanation}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 結論</Text>
          <Text style={styles.bodyText}>{conclusion}</Text>
        </View>

        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: cfg.accent }]}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>🏠 回到首頁</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  riskIcon: {
    fontSize: 64,
  },
  riskLabel: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  riskScore: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.75)',
  },
  body: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  lowConfidenceBox: {
    backgroundColor: '#e65100',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  lowConfidenceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  lowConfidenceItem: {
    fontSize: 19,
    color: '#ffffff',
    lineHeight: 30,
  },
  humanReviewBox: {
    backgroundColor: '#f57f17',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 6,
  },
  humanReviewText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  humanReviewSub: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
  },
  notifyBox: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  notifyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  evidenceItem: {
    fontSize: 20,
    color: '#444',
    lineHeight: 30,
  },
  bodyText: {
    fontSize: 20,
    color: '#444',
    lineHeight: 32,
  },
  homeButton: {
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 3,
    marginTop: 8,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
});
