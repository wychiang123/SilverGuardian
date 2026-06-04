import React, { useState, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { transcribeAudio } from '../services/whisperApi';
import { classifyVoiceInput } from '../services/gptApi';
import type { VoiceClassifyResult } from '../services/gptApi';
import { saveRecord } from '../services/storageService';
import { saveToCalendar } from '../services/calendarService';
import { checkRateLimit } from '../services/rateLimitService';

// @ts-ignore
import AudioRecord from 'react-native-audio-record';

type RecordingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Recording'>;

interface Props {
  navigation: RecordingScreenNavigationProp;
}

export default function RecordingScreen({ navigation }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('辨識中，請稍候...');
  const [transcript, setTranscript] = useState('');
  const isRecordingRef = useRef(false);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const current = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      console.log('[RecordingScreen] RECORD_AUDIO current status:', current);

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '需要麥克風權限',
          message: '錄音功能需要使用麥克風',
          buttonPositive: '允許',
          buttonNegative: '拒絕',
        },
      );
      console.log('[RecordingScreen] RECORD_AUDIO after request:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    console.log('[RecordingScreen] iOS platform, permission assumed granted');
    return true;
  };

  const startRecording = async () => {
    if (isProcessing) return;
    console.log('[RecordingScreen] startRecording called');
    const hasPermission = await requestPermission();
    console.log('[RecordingScreen] hasPermission:', hasPermission);
    if (!hasPermission) {
      Alert.alert('錯誤', '請允許麥克風權限才能錄音');
      return;
    }

    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: 'audio.wav',
    });
    AudioRecord.start();
    isRecordingRef.current = true;
    setIsRecording(true);
    setTranscript('');
  };

  const showConfirmAlert = (classified: VoiceClassifyResult) => {
    let title = '';
    let message = '';

    if (classified.type === 'expense') {
      title = '💰 記帳確認';
      message = `類別：${classified.category ?? '其他'}\n\n金額：${classified.amount ?? '？'} 元\n\n${classified.summary}\n\n確認記錄嗎？`;
    } else if (classified.type === 'memo') {
      title = '📝 備忘確認';
      message = `${classified.summary}\n\n確認記錄嗎？`;
    } else {
      title = '📅 行事曆確認';
      message = `日期：${classified.date ?? '未指定'}\n時間：${classified.time ?? '未指定'}\n\n${classified.summary}\n\n確認記錄嗎？`;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '✅  確認記錄',
          onPress: async () => {
            try {
              await saveRecord({
                type: classified.type,
                content: classified.content,
                amount: classified.amount,
                category: classified.category,
                date: classified.date,
                time: classified.time,
                summary: classified.summary,
                createdAt: new Date().toISOString(),
              });

              if (classified.type === 'calendar' && classified.date) {
                try {
                  const added = await saveToCalendar(
                    classified.summary ?? classified.content,
                    classified.date,
                    classified.time ?? '未指定',
                  );
                  if (added) {
                    Alert.alert('✅ 已加入手機行事曆！', '', [{ text: '好的' }]);
                    return;
                  }
                } catch {
                  // fall through to show failure message
                }
                Alert.alert('加入行事曆失敗，已儲存在APP記錄中', '', [{ text: '好的' }]);
                return;
              }

              Alert.alert('✅ 已記錄！', '您的記錄已儲存', [{ text: '好的' }]);
            } catch {
              Alert.alert('錯誤', '儲存失敗，請重試');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const audioFile: string = await AudioRecord.stop();
      console.log('[RecordingScreen] audioFile path:', audioFile);

      setProcessingLabel('辨識中，請稍候...');
      await checkRateLimit();
      const text = await transcribeAudio(audioFile);
      console.log('[RecordingScreen] transcription result:', text);
      setTranscript(text);

      setProcessingLabel('AI 分析中...');
      const classified = await classifyVoiceInput(text);
      console.log('[RecordingScreen] classified:', JSON.stringify(classified, null, 2));

      showConfirmAlert(classified);
    } catch (error: unknown) {
      const axiosError = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      if (!axiosError.response) {
        Alert.alert('提示', axiosError.message ?? '發生未知錯誤');
        return;
      }
      console.error('[RecordingScreen] error:', axiosError.message);
      console.error('[RecordingScreen] error.response.status:', axiosError.response?.status);
      console.error('[RecordingScreen] error.response.data:', JSON.stringify(axiosError.response?.data, null, 2));
      Alert.alert(
        '語音辨識失敗',
        `status: ${axiosError.response?.status ?? 'N/A'}\n\n${JSON.stringify(axiosError.response?.data, null, 2) ?? axiosError.message}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>語音記錄</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.instruction}>按住不放，放開送出</Text>
        <Text style={styles.subInstruction}>
          請用國語或台語說明您要記錄的內容{'\n'}（記帳、備忘、行事曆皆可）
        </Text>

        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
          activeOpacity={1}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.recordIcon}>🎙️</Text>
              <Text style={styles.recordLabel}>
                {isRecording ? '錄音中...' : '按住說話'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isProcessing && (
          <Text style={styles.processingText}>{processingLabel}</Text>
        )}

        {transcript !== '' && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>辨識結果：</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
      </ScrollView>

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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 32,
    gap: 28,
  },
  instruction: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1b5e20',
    textAlign: 'center',
  },
  subInstruction: {
    fontSize: 22,
    color: '#555',
    textAlign: 'center',
    lineHeight: 34,
  },
  recordButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#1b5e20',
    transform: [{ scale: 1.06 }],
  },
  recordIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  recordLabel: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  processingText: {
    fontSize: 22,
    color: '#1b5e20',
    fontWeight: '600',
  },
  transcriptBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  transcriptLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 24,
    color: '#444',
    lineHeight: 36,
  },
});
