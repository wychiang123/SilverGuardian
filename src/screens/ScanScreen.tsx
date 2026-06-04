import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { analyzeScamImage } from '../services/gptApi';
import type { ScamAnalysisResult } from '../services/gptApi';
import { checkRateLimit } from '../services/rateLimitService';

type RiskLevel = '高風險' | '中風險' | '低風險' | '資訊不足';

// Recalibrated high-risk groups (investment keywords alone excluded)
const HIGH_RISK_GROUPS: { keywords: string[]; score: number }[] = [
  { keywords: ['ATM解除分期', '誤設分期', '解除分期付款'], score: 70 },
  { keywords: ['匯款', '轉帳'], score: 60 },
  { keywords: ['驗證碼', '個資蒐集', '帳戶密碼', '身份證字號'], score: 55 },
  { keywords: ['假冒銀行', '假冒檢警', '假冒政府', '冒充警察', '冒充銀行'], score: 60 },
  { keywords: ['保證獲利', '保證賺錢', '穩賺', '零風險獲利'], score: 50 },
  { keywords: ['中獎', '領獎', '手續費'], score: 40 },
];

// Anchors: if present, whitelist cap is bypassed
const HIGH_RISK_ANCHORS = ['匯款', '轉帳', 'ATM', '驗證碼', '假冒', '冒充'];

// Whitelist groups (negative scores — legitimate message patterns)
const WHITELIST_GROUPS: { keywords: string[]; score: number }[] = [
  { keywords: ['刷卡消費', '消費通知', '帳單通知', '消費明細', '信用卡帳單'], score: -40 },
  { keywords: ['門診提醒', '掛號通知', '醫院通知', '看診提醒', '回診提醒'], score: -40 },
  { keywords: ['物流通知', '包裹到達', '配送通知', '到貨通知', '取件通知'], score: -30 },
  { keywords: ['會議通知', '公司通知', '學校通知', '課程通知', '行程提醒'], score: -30 },
  { keywords: ['好久不見', '最近好嗎', '吃飯了嗎', '在哪裡呢'], score: -30 },
  { keywords: ['水電費', '電信帳單', '電費通知', '水費通知', '瓦斯帳單'], score: -35 },
];

// Keywords that signal ambiguous/incomplete content → 資訊不足
const INSUFFICIENT_INFO_KEYWORDS = ['文件確認', '補件通知', '身分不明', '不完整通知'];

interface RuleEngineResult {
  score: number;
  whitelistCap: number | null;
  hasHighRiskKeyword: boolean;
  hasInsufficientInfoPattern: boolean;
}

function runRuleEngine(text: string): RuleEngineResult {
  let score = 0;
  let hasWhitelistMatch = false;
  let hasHighRiskKeyword = false;

  for (const group of HIGH_RISK_GROUPS) {
    if (group.keywords.some(kw => text.includes(kw))) {
      score += group.score;
      hasHighRiskKeyword = true;
    }
  }

  const hasHighRiskAnchor = HIGH_RISK_ANCHORS.some(kw => text.includes(kw));

  for (const group of WHITELIST_GROUPS) {
    if (group.keywords.some(kw => text.includes(kw))) {
      score += group.score;
      hasWhitelistMatch = true;
    }
  }

  const whitelistCap = (hasWhitelistMatch && !hasHighRiskAnchor) ? 25 : null;
  if (whitelistCap !== null) {
    score = Math.min(score, whitelistCap);
  }

  const hasInsufficientInfoPattern = INSUFFICIENT_INFO_KEYWORDS.some(kw => text.includes(kw));

  return {
    score: Math.max(0, Math.min(score, 100)),
    whitelistCap,
    hasHighRiskKeyword,
    hasInsufficientInfoPattern,
  };
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return '高風險';
  if (score >= 40) return '中風險';
  return '低風險';
}

function computeFinalResult(
  rule: RuleEngineResult,
  ai: ScamAnalysisResult,
): { riskLevel: RiskLevel; finalScore: number } {
  const { score: ruleScore, whitelistCap, hasHighRiskKeyword, hasInsufficientInfoPattern } = rule;

  // 資訊不足: checked FIRST, before score thresholds
  const isInsufficientInfo =
    hasInsufficientInfoPattern ||
    (ruleScore < 20 && ai.confidence < 50) ||
    (!hasHighRiskKeyword && ai.confidence < 40);

  if (isInsufficientInfo) {
    return { riskLevel: '資訊不足', finalScore: Math.round((ruleScore + ai.ai_score) / 2) };
  }

  // Unified: finalScore = average of rule + AI, riskLevel always derived from finalScore
  let finalScore = Math.min(Math.round((ruleScore + ai.ai_score) / 2), 100);

  // Whitelist cap propagates to finalScore — not just ruleScore
  if (whitelistCap !== null) {
    finalScore = Math.min(finalScore, whitelistCap);
  }

  return { riskLevel: scoreToLevel(finalScore), finalScore };
}

type ScanScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Scan'>;

interface Props {
  navigation: ScanScreenNavigationProp;
}

export default function ScanScreen({ navigation }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const processAssetAndNavigate = async (asset: {
    uri?: string;
    base64?: string;
  }) => {
    if (!asset.uri) {
      Alert.alert('錯誤', '無法取得照片，asset 或 uri 為空');
      return;
    }
    console.log('[ScanScreen] asset uri:', asset.uri);
    console.log('[ScanScreen] asset has base64:', !!asset.base64);
    setIsProcessing(true);
    try {
      const base64 =
        asset.base64 ?? (await RNFS.readFile(asset.uri.replace('file://', ''), 'base64'));
      await checkRateLimit();
      const aiResult = await analyzeScamImage(base64);
      // Rule engine runs on OCR text only — fully independent of GPT analysis output
      const rule = runRuleEngine(aiResult.ocr_text ?? '');
      const { riskLevel, finalScore } = computeFinalResult(rule, aiResult);
      navigation.navigate('Result', {
        riskLevel,
        finalScore,
        confidence: aiResult.confidence,
        needHumanReview: aiResult.need_human_review,
        evidenceHigh: aiResult.evidence_high,
        evidenceLow: aiResult.evidence_low,
        explanation: aiResult.explanation,
        conclusion: aiResult.conclusion,
      });
    } catch (error: unknown) {
      const axiosError = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      if (!axiosError.response) {
        Alert.alert('提示', axiosError.message ?? '發生未知錯誤');
        return;
      }
      console.error('[ScanScreen] analyzeScamImage error:', axiosError.message);
      console.error('[ScanScreen] error.response.status:', axiosError.response?.status);
      console.error('[ScanScreen] error.response.data:', JSON.stringify(axiosError.response?.data, null, 2));
      Alert.alert(
        '圖片分析失敗',
        `status: ${axiosError.response?.status ?? 'N/A'}\n\n${JSON.stringify(axiosError.response?.data, null, 2) ?? axiosError.message}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: '需要相機權限',
        message: '拍照檢查功能需要使用相機',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    console.log('[ScanScreen] CAMERA permission result:', granted);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      {
        title: '需要相簿權限',
        message: '從相簿選取功能需要存取您的照片',
        buttonPositive: '允許',
        buttonNegative: '拒絕',
      },
    );
    console.log('[ScanScreen] READ_MEDIA_IMAGES permission result:', granted);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleScan = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('需要相機權限', '請到手機設定 > 應用程式 > SilverGuardian > 權限，開啟相機權限');
      return;
    }

    launchCamera(
      { mediaType: 'photo', includeBase64: true, saveToPhotos: false, quality: 0.8 },
      async response => {
        console.log('[ScanScreen] launchCamera response:', JSON.stringify({
          didCancel: response.didCancel,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          assetsCount: response.assets?.length,
        }));
        if (response.didCancel) {
          console.log('[ScanScreen] 使用者取消相機');
          return;
        }
        if (response.errorCode) {
          Alert.alert(
            '相機開啟失敗',
            `errorCode: ${response.errorCode}\nerrorMessage: ${response.errorMessage ?? '無說明'}`,
          );
          return;
        }
        const asset = response.assets?.[0];
        if (asset) await processAssetAndNavigate(asset);
      },
    );
  };

  const handlePickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: true, quality: 0.8 },
      async response => {
        console.log('[ScanScreen] launchImageLibrary full response:', JSON.stringify(response, null, 2));
        if (response.didCancel) {
          console.log('[ScanScreen] 使用者取消相簿');
          return;
        }
        if (response.errorCode) {
          Alert.alert(
            '相簿開啟失敗',
            `errorCode: ${response.errorCode}\nerrorMessage: ${response.errorMessage ?? '無說明'}`,
          );
          return;
        }
        const asset = response.assets?.[0];
        if (asset) await processAssetAndNavigate(asset);
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>拍照檢查</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>拍下可疑訊息</Text>
        <Text style={styles.subInstruction}>
          LINE 訊息、簡訊、廣告皆可{'\n'}AI 幫您判斷是否為詐騙
        </Text>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleScan}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraLabel}>點擊拍照</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.libraryButton}
          onPress={handlePickImage}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.cameraIcon}>🖼️</Text>
              <Text style={styles.cameraLabel}>從相簿選取</Text>
            </>
          )}
        </TouchableOpacity>

        {isProcessing && (
          <Text style={styles.processingText}>AI 分析中，請稍候...</Text>
        )}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  instruction: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#b71c1c',
    textAlign: 'center',
  },
  subInstruction: {
    fontSize: 24,
    color: '#555',
    textAlign: 'center',
    lineHeight: 36,
  },
  cameraButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cameraIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  cameraLabel: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  libraryButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#e65100',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  processingText: {
    fontSize: 24,
    color: '#c62828',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
