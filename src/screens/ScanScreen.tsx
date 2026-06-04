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
import { checkRateLimit } from '../services/rateLimitService';

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
      const result = await analyzeScamImage(base64);
      navigation.navigate('Result', result);
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
    Alert.alert('按鈕有反應', '準備開啟相簿...');

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
