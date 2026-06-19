# SilverGuardian

SilverGuardian 是一個以長者使用情境為核心的 React Native 行動應用程式。根據目前程式碼推導，應用主要用來協助使用者辨識疑似詐騙訊息，並透過語音快速記錄支出、備忘與行事曆事項。

> 注意：本文件根據目前專案程式碼推導而成。若功能在程式中沒有完整實作或無法確認，會以「推測」標註。

## 主要功能

### 1. 圖片詐騙風險辨識

使用者可以透過相機拍攝或從相簿選擇圖片，應用會將圖片轉成 base64 後送至 OpenAI Chat Completions API 進行分析。

目前流程包含：

- 拍攝照片或選取圖片
- 呼叫 OpenAI 進行圖片內容分析與疑似詐騙評分
- 使用本機規則引擎補充分數判斷
- 綜合 AI 分數與規則分數產生最終風險等級
- 顯示證據、說明、結論、信心分數與 debug 資訊
- 高風險時嘗試通知家人

### 2. 語音記錄

使用者可以按住錄音按鈕輸入語音。應用會將錄音檔送至 OpenAI Whisper API 轉文字，再使用 OpenAI 將文字分類為支出、備忘或行事曆事件。

目前流程包含：

- 麥克風權限請求
- 錄音
- Whisper 語音轉文字
- AI 分類文字內容
- 使用者確認後儲存記錄
- 若分類為行事曆事件，嘗試寫入系統行事曆

### 3. 歷史記錄

語音分類後的資料會儲存在本機 AsyncStorage。歷史頁面會顯示已儲存的支出、備忘與行事曆類型記錄，並支援刪除。

### 4. 家人通知設定

設定頁面可輸入最多 3 組家人 Email。當圖片詐騙辨識結果為高風險時，應用會嘗試透過 SendGrid 寄送通知。

### 5. 本機每日使用次數限制

目前有本機 rate limit 機制，每日上限為 99 次。此限制儲存在 AsyncStorage。

## 技術棧

- React Native 0.85.3
- React 19.2.3
- TypeScript
- React Navigation
- AsyncStorage
- Axios
- OpenAI Chat Completions API
- OpenAI Whisper API
- SendGrid Mail API
- react-native-image-picker
- react-native-audio-record
- react-native-calendar-events
- react-native-config
- react-native-fs
- Jest

## 專案結構

```text
SilverGuardian/
  App.tsx
  index.js
  package.json
  src/
    screens/
      HomeScreen.tsx
      RecordingScreen.tsx
      ScanScreen.tsx
      ResultScreen.tsx
      HistoryScreen.tsx
      SettingsScreen.tsx
    services/
      gptApi.ts
      whisperApi.ts
      storageService.ts
      rateLimitService.ts
      calendarService.ts
      notifyService.ts
  android/
  ios/
  __tests__/
  docs/
```

## 重要檔案

- `App.tsx`：應用導覽入口，定義主要頁面與 route 參數型別。
- `src/screens/HomeScreen.tsx`：首頁，提供語音記錄與圖片掃描入口。
- `src/screens/RecordingScreen.tsx`：錄音、轉文字、AI 分類、儲存與行事曆寫入流程。
- `src/screens/ScanScreen.tsx`：圖片選取、OpenAI 分析、本機詐騙規則引擎與風險計算。
- `src/screens/ResultScreen.tsx`：顯示詐騙風險結果，並於高風險時通知家人。
- `src/screens/HistoryScreen.tsx`：顯示與刪除本機歷史記錄。
- `src/screens/SettingsScreen.tsx`：管理家人 Email。
- `src/services/gptApi.ts`：OpenAI 圖片分析與語音文字分類。
- `src/services/whisperApi.ts`：OpenAI Whisper 語音轉文字。
- `src/services/storageService.ts`：AsyncStorage 記錄儲存。
- `src/services/rateLimitService.ts`：每日使用次數限制。
- `src/services/calendarService.ts`：系統行事曆寫入。
- `src/services/notifyService.ts`：SendGrid 家人通知。

## 環境變數

目前程式透過 `react-native-config` 讀取以下變數：

```text
OPENAI_API_KEY
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
```

安全提醒：目前程式碼是由手機端直接呼叫 OpenAI 與 SendGrid。若應用要正式上線，建議改由後端服務代管 API 金鑰與外部 API 呼叫，避免金鑰被反編譯或濫用。

## 可用指令

```sh
npm start
npm run android
npm run ios
npm test
npm run lint
```

## 目前狀態

- TypeScript 專案設定存在，並使用 React Native 預設 TypeScript 設定。
- Android 與 iOS 原生專案皆存在。
- Android Manifest 已宣告網路、錄音、相機與行事曆權限。
- 測試檔目前只有基本 App render test。
- 根據檢查，Jest 目前可能需要額外設定才能正確處理 React Navigation 的 ESM 模組。

## 相關文件

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/roadmap.md`
