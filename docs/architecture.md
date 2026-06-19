# 架構文件

本文件根據目前 SilverGuardian 專案程式碼推導，描述現有系統架構、資料流與主要模組責任。

## 架構總覽

SilverGuardian 目前是單一 React Native 行動應用，沒有可見的後端服務。所有主要流程都在手機端完成，並直接呼叫第三方服務。

```text
使用者
  |
  v
React Native App
  |
  +-- Screens
  |     +-- HomeScreen
  |     +-- RecordingScreen
  |     +-- ScanScreen
  |     +-- ResultScreen
  |     +-- HistoryScreen
  |     +-- SettingsScreen
  |
  +-- Services
        +-- gptApi
        +-- whisperApi
        +-- storageService
        +-- rateLimitService
        +-- calendarService
        +-- notifyService
  |
  +-- Local Device
  |     +-- AsyncStorage
  |     +-- Camera / Photo Library
  |     +-- Microphone
  |     +-- Calendar
  |
  +-- External APIs
        +-- OpenAI
        +-- SendGrid
```

## 導覽架構

`App.tsx` 使用 React Navigation Stack 建立主要頁面。

目前 route 包含：

- `Home`
- `Recording`
- `Scan`
- `Result`
- `History`
- `Settings`

`Result` route 會接收圖片分析後的完整結果參數，包含風險等級、分數、信心分數、證據、說明、結論與 debug 資訊。

## 畫面層

### HomeScreen

首頁負責提供主要入口。

責任：

- 導向語音記錄頁。
- 導向圖片掃描頁。
- 導向歷史頁。
- 導向設定頁。
- 離開 App。

### RecordingScreen

語音記錄頁負責整個語音輸入流程。

責任：

- 請求錄音權限。
- 使用 `react-native-audio-record` 錄音。
- 呼叫 `rateLimitService` 檢查每日用量。
- 呼叫 `whisperApi` 轉錄語音。
- 呼叫 `gptApi` 分類文字。
- 顯示確認對話框。
- 呼叫 `storageService` 儲存記錄。
- 必要時呼叫 `calendarService` 寫入行事曆。

目前這個畫面包含較多流程控制與錯誤處理邏輯。

### ScanScreen

圖片掃描頁負責圖片取得與詐騙風險判斷流程。

責任：

- 請求相機或圖片權限。
- 使用 `react-native-image-picker` 拍攝或選取圖片。
- 使用 `react-native-fs` 讀取圖片 base64。
- 呼叫 `rateLimitService` 檢查每日用量。
- 呼叫 `gptApi.analyzeScamImage` 分析圖片。
- 執行本機規則引擎。
- 計算最終風險分數。
- 導向結果頁。

目前詐騙規則引擎與分數加權邏輯直接寫在 `ScanScreen.tsx`。

### ResultScreen

結果頁負責呈現圖片分析結果。

責任：

- 根據風險等級套用不同顏色與顯示文案。
- 顯示分數、信心分數、證據、說明與結論。
- 顯示低信心或需人工複查提示。
- 若為高風險，呼叫 `notifyService.notifyFamily`。
- 顯示家人通知狀態。

### HistoryScreen

歷史頁負責本機記錄列表。

責任：

- 進入畫面時從 AsyncStorage 讀取記錄。
- 顯示支出、備忘與行事曆記錄。
- 刪除記錄。
- 顯示空狀態。

### SettingsScreen

設定頁負責家人 Email 設定。

責任：

- 從 AsyncStorage 讀取已儲存 Email。
- 編輯最多 3 組 Email。
- 進行基本格式驗證。
- 儲存 Email。

## 服務層

### gptApi

負責 OpenAI Chat Completions 呼叫。

主要函式：

- `analyzeScamImage(imageBase64)`
- `classifyVoiceInput(text)`

`analyzeScamImage` 使用圖片輸入與系統提示詞，要求模型回傳 JSON 格式的詐騙分析結果。

`classifyVoiceInput` 使用語音轉錄文字，要求模型回傳 JSON 格式的支出、備忘或行事曆分類結果。

### whisperApi

負責 OpenAI Whisper API 呼叫。

主要函式：

- `transcribeAudio(filePath)`

目前語言參數設定為 `zh`。

### storageService

負責本機記錄儲存。

主要函式：

- `saveRecord`
- `getRecords`
- `deleteRecord`

資料儲存在 AsyncStorage key `silver_guardian_records`。

### rateLimitService

負責本機每日使用次數限制。

主要函式：

- `checkRateLimit`
- `getRemainingCount`

目前每日上限為 99 次，key 依日期產生。

### calendarService

負責系統行事曆權限與事件寫入。

主要函式：

- `saveToCalendar`

Android 會請求讀寫行事曆權限，iOS 會呼叫 `RNCalendarEvents.requestPermissions()`。

### notifyService

負責家人通知。

主要函式：

- `notifyFamily`

流程：

- 從 AsyncStorage 讀取 `family_emails`。
- 過濾可用 Email。
- 使用 SendGrid API 寄送 HTML Email。

## 資料流

### 圖片詐騙辨識資料流

```text
使用者拍照或選圖
  -> ScanScreen
  -> 圖片 base64
  -> rateLimitService.checkRateLimit
  -> gptApi.analyzeScamImage
  -> 本機規則引擎 runRuleEngine
  -> computeFinalResult
  -> ResultScreen
  -> 高風險時 notifyService.notifyFamily
  -> SendGrid
```

### 語音記錄資料流

```text
使用者按住錄音
  -> RecordingScreen
  -> AudioRecord 產生音訊檔
  -> rateLimitService.checkRateLimit
  -> whisperApi.transcribeAudio
  -> gptApi.classifyVoiceInput
  -> 使用者確認
  -> storageService.saveRecord
  -> 若為行事曆則 calendarService.saveToCalendar
```

### 歷史記錄資料流

```text
HistoryScreen
  -> storageService.getRecords
  -> AsyncStorage
  -> 顯示列表
```

### 家人 Email 設定資料流

```text
SettingsScreen
  -> AsyncStorage family_emails
  -> notifyService 於高風險事件讀取
```

## 儲存架構

目前使用 AsyncStorage 儲存：

- `silver_guardian_records`：語音記錄列表。
- `family_emails`：家人 Email 陣列。
- `rate_limit_YYYY-MM-DD`：每日 AI 使用次數。

目前沒有看到資料庫、雲端同步或使用者帳號系統。

## 外部服務

### OpenAI

目前用於：

- 圖片詐騙分析。
- 語音文字分類。
- 語音轉文字。

API key 透過 `react-native-config` 讀取。

### SendGrid

目前用於高風險通知家人。

API key 與寄件者 Email 透過 `react-native-config` 讀取。

## 權限

Android Manifest 目前宣告：

- `INTERNET`
- `RECORD_AUDIO`
- `CAMERA`
- `READ_CALENDAR`
- `WRITE_CALENDAR`

程式中也會在執行時請求錄音、相機、圖片與行事曆權限。

## 測試架構

目前只有 `__tests__/App.test.tsx`，內容是基本 render test。

根據檢查，Jest 目前可能無法直接處理 React Navigation 的 ESM 輸出，需要額外 transform 或 mock 設定。

## 目前架構風險

- 手機端直接呼叫 OpenAI 與 SendGrid，API 金鑰有暴露風險。
- 重要詐騙規則邏輯位於畫面檔案，測試與維護成本較高。
- 本機 rate limit 可被清除或繞過，不適合作為正式成本控管。
- AI 回傳 JSON 直接 `JSON.parse`，若格式錯誤會造成流程失敗。
- console log 可能輸出使用者圖片文字、轉錄內容或 API 錯誤細節。
- 目前沒有集中式錯誤處理、資料加密或隱私同意流程。
