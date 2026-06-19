# AI Agent 接手指南

本文件提供給未來接手 SilverGuardian 專案的 AI Agent 使用，例如 ChatGPT、Claude Code、Codex、OpenHands。目標是在最短時間內理解專案目的、架構、風險與優先工作。

> 本文件根據目前專案程式碼、`README.md`、`docs/requirements.md`、`docs/architecture.md`、`docs/roadmap.md` 推導。若無法從程式碼完全確認，會標註「推測」。

## 專案目的

SilverGuardian 是一個 React Native 行動應用程式，主要目標是協助長者或需要簡化操作流程的使用者：

- 判斷收到的截圖、照片或通訊軟體訊息是否可能涉及詐騙。
- 使用語音快速記錄支出、備忘或行事曆事件。
- 在疑似高風險詐騙時通知家人或照護者。

推測此專案的主要市場是繁體中文使用者，因為目前介面文字、OpenAI prompt 與 Whisper 語言設定皆以中文情境為主。

## 核心功能

### 圖片詐騙風險辨識

使用者可以拍照或從相簿選擇圖片。App 會將圖片轉為 base64，送至 OpenAI Chat Completions API 分析，再結合本機規則引擎產生最終風險等級。

目前結果包含：

- 風險等級
- 最終分數
- AI 信心分數
- 是否需要人工複查
- 高風險證據
- 低風險證據
- 分析說明
- 結論
- Debug 資訊

### 語音記錄

使用者按住錄音按鈕輸入語音。App 會將錄音檔送至 OpenAI Whisper API 轉文字，再使用 OpenAI 將文字分類為：

- 支出
- 備忘
- 行事曆

使用者確認後，資料會儲存在本機 AsyncStorage。若分類為行事曆事件，App 會嘗試寫入裝置行事曆。

### 家人通知

使用者可在設定頁輸入最多 3 組家人 Email。當圖片詐騙辨識結果為高風險時，App 會透過 SendGrid 嘗試寄出通知。

### 歷史記錄

目前歷史記錄主要保存語音流程產生的支出、備忘與行事曆資料。使用者可以查看與刪除記錄。

### 本機每日使用限制

App 使用 AsyncStorage 記錄每日 API 使用次數，目前每日上限為 99 次。

## 系統架構摘要

目前架構是單一 React Native App，沒有可見的後端服務。手機端直接呼叫 OpenAI 與 SendGrid。

```text
使用者
  -> React Native App
      -> Screens
          -> HomeScreen
          -> RecordingScreen
          -> ScanScreen
          -> ResultScreen
          -> HistoryScreen
          -> SettingsScreen
      -> Services
          -> gptApi
          -> whisperApi
          -> storageService
          -> rateLimitService
          -> calendarService
          -> notifyService
      -> Local Device
          -> AsyncStorage
          -> Camera / Photo Library
          -> Microphone
          -> Calendar
      -> External APIs
          -> OpenAI
          -> SendGrid
```

目前沒有集中式狀態管理。畫面使用 React local state，資料持久化使用 AsyncStorage。

## 重要資料夾與檔案說明

### 根目錄

- `App.tsx`：React Navigation stack 入口，定義 route 與 `RootStackParamList`。
- `index.js`：React Native app registration。
- `package.json`：npm scripts、React Native 與相關依賴。
- `jest.config.js`：Jest 設定，目前只有 React Native preset。
- `tsconfig.json`：TypeScript 設定，延伸 React Native 預設設定。
- `.env`：目前包含 OpenAI 與 SendGrid 相關環境變數。請注意，手機端直接使用 API key 有安全風險。

### `src/screens`

- `HomeScreen.tsx`：首頁與主要入口。
- `RecordingScreen.tsx`：錄音、Whisper 轉錄、AI 分類、儲存、行事曆寫入流程。
- `ScanScreen.tsx`：圖片取得、OpenAI 圖片分析、本機詐騙規則引擎、最終分數計算。
- `ResultScreen.tsx`：顯示詐騙分析結果，並在高風險時觸發家人通知。
- `HistoryScreen.tsx`：讀取與刪除本機歷史記錄。
- `SettingsScreen.tsx`：設定家人 Email。

### `src/services`

- `gptApi.ts`：OpenAI Chat Completions 呼叫，包含圖片詐騙分析與語音文字分類。
- `whisperApi.ts`：OpenAI Whisper 語音轉文字。
- `storageService.ts`：AsyncStorage 歷史記錄儲存。
- `rateLimitService.ts`：本機每日使用次數限制。
- `calendarService.ts`：裝置行事曆權限與事件建立。
- `notifyService.ts`：SendGrid 家人通知。

### Native 專案

- `android/`：Android 原生專案。Manifest 已宣告網路、錄音、相機、行事曆權限。
- `ios/`：iOS 原生專案。

### 文件

- `README.md`：專案總覽。
- `docs/requirements.md`：需求推導。
- `docs/architecture.md`：架構說明。
- `docs/roadmap.md`：後續改善方向。
- `docs/agent-guide.md`：本文件。

## 如何安裝與執行

請先安裝 Node.js，專案要求：

```text
node >= 22.11.0
```

安裝依賴：

```sh
npm install
```

啟動 Metro：

```sh
npm start
```

執行 Android：

```sh
npm run android
```

執行 iOS：

```sh
npm run ios
```

iOS 第一次執行或原生依賴更新後，通常需要安裝 CocoaPods：

```sh
bundle install
bundle exec pod install
```

## 如何執行測試

執行測試：

```sh
npm test
```

執行 TypeScript 檢查：

```sh
./node_modules/.bin/tsc --noEmit
```

在 Windows PowerShell 中，若 `npx` 因執行原則被阻擋，可改用：

```bat
.\node_modules\.bin\tsc.cmd --noEmit
```

目前已知狀況：

- TypeScript 檢查可通過。
- Jest 可能因 React Navigation 的 ESM 輸出與 native module mock 不足而失敗。
- 若要讓 AI Agent 安全修改專案，建議優先補強 Jest 設定與 mock。

## 關鍵業務邏輯位置

### 詐騙規則引擎

目前位於：

```text
src/screens/ScanScreen.tsx
```

重要函式：

- `runRuleEngine`
- `computeFinalResult`
- `scoreToLevel`

此處是最高風險業務邏輯。它決定詐騙風險分數、白名單上限、資訊不足判斷與最終風險等級。

修改前務必：

- 先補測試。
- 建立高風險、中風險、低風險、資訊不足案例。
- 確認白名單與高風險 anchor 的優先順序。
- 避免只根據 UI 需求順手修改規則。

### 語音分類流程

目前位於：

```text
src/screens/RecordingScreen.tsx
src/services/gptApi.ts
src/services/whisperApi.ts
```

關鍵流程：

1. 錄音。
2. Whisper 轉文字。
3. OpenAI 分類為支出、備忘、行事曆。
4. 使用者確認。
5. 儲存或寫入行事曆。

### 家人通知流程

目前位於：

```text
src/screens/ResultScreen.tsx
src/services/notifyService.ts
src/screens/SettingsScreen.tsx
```

高風險結果會在 `ResultScreen` 的 effect 中呼叫 `notifyFamily`。

## OpenAI 相關模組說明

### `src/services/gptApi.ts`

此檔案負責 OpenAI Chat Completions API。

主要功能：

- `analyzeScamImage(imageBase64)`：分析圖片是否有詐騙風險。
- `classifyVoiceInput(text)`：將語音轉錄文字分類為支出、備忘或行事曆。

目前模型：

```text
gpt-4o-mini
```

目前風險：

- prompt、HTTP 呼叫、型別定義與 JSON parse 混在同一檔。
- AI 回傳內容直接 `JSON.parse`。
- 沒有 schema validation。
- 若模型回傳格式偏離預期，App 可能直接進入錯誤流程。
- API key 由手機端透過 `react-native-config` 讀取，正式上線有安全風險。

建議：

- 新增 response schema validation。
- 將 prompt、API client、資料驗證拆開。
- 將 OpenAI 呼叫移至後端代理服務。

### `src/services/whisperApi.ts`

此檔案負責 OpenAI Whisper API。

主要功能：

- `transcribeAudio(filePath)`

目前設定：

- model：`whisper-1`
- language：`zh`

目前風險：

- 錄音檔 mime type 與實際檔案格式需確認。
- API 失敗或轉錄品質不佳時，後續分類準確度會受影響。
- 手機端直接持有 OpenAI key。

## SendGrid 相關模組說明

### `src/services/notifyService.ts`

此檔案負責寄送家人通知。

主要功能：

- `notifyFamily(scamMessage, imageDescription)`

流程：

1. 從 AsyncStorage 讀取 `family_emails`。
2. 解析 Email 陣列。
3. 過濾基本有效 Email。
4. 使用 SendGrid API 寄送 HTML email。

目前風險：

- 手機端直接使用 SendGrid API key。
- Email HTML body 由字串組成，需注意內容 escaping。
- 寄送失敗處理仍偏基本。
- 通知副作用由 `ResultScreen` 觸發，UI lifecycle 與外部副作用耦合。

建議：

- 移至後端寄送。
- 建立通知狀態與 retry 策略。
- 避免在前端組裝敏感通知內容。

## 已知技術債

1. 核心詐騙規則與 UI 混在 `ScanScreen.tsx`。
2. 語音記錄流程與 UI 混在 `RecordingScreen.tsx`。
3. OpenAI prompt、HTTP client、資料解析與型別定義耦合。
4. 手機端直接呼叫 OpenAI 與 SendGrid，API key 有暴露風險。
5. 本機 rate limit 可被清除或繞過，不適合作為正式成本控管。
6. Jest 測試環境不足，native module 與 React Navigation mock 尚未完善。
7. 重要業務邏輯缺少單元測試。
8. AI 回傳 JSON 缺少 schema validation。
9. 部分 console log 可能輸出敏感資料，例如轉錄文字、圖片分析內容、API 錯誤資料。
10. `family_emails` 等 storage key 分散在不同模組。

## 已知問題

- `npm test` 可能因 Jest 無法處理 React Navigation ESM 模組而失敗。
- 圖片詐騙規則引擎沒有測試保護。
- OpenAI 回傳非預期 JSON 時缺少細緻 fallback。
- 家人通知與結果頁 UI lifecycle 耦合。
- 高風險通知只在圖片掃描流程中觸發；語音流程目前沒有看到通知機制。
- 歷史頁目前主要顯示語音記錄，未看到圖片掃描結果保存。
- API key 位於手機端環境變數架構中，正式產品化前需調整。

## AI Agent 修改程式時應避免的風險

### 不要在沒有測試時修改詐騙分數規則

`ScanScreen.tsx` 中的規則會直接影響高風險、中風險、低風險與資訊不足判斷。修改前應先建立測試案例。

### 不要把 UI 改動和業務邏輯改動混在同一次變更

特別是：

- `ScanScreen.tsx`
- `RecordingScreen.tsx`
- `ResultScreen.tsx`

這些檔案同時有 UI 與 side effect。建議先拆模組，再改畫面。

### 不要直接更換 OpenAI prompt 而不驗證輸出格式

prompt 改動可能導致 JSON 結構改變。任何 prompt 調整都應搭配 schema validation 與測試。

### 不要新增更多手機端秘密

OpenAI 與 SendGrid key 已是高風險設計。不要再增加新的第三方 secret 到手機端。

### 不要依賴本機 rate limit 做正式成本控制

AsyncStorage rate limit 只能作為簡單本機保護，不可作為正式安全或成本控管。

### 不要在正式環境保留敏感 log

避免記錄：

- 使用者轉錄文字
- 圖片 OCR 內容
- 家人 Email
- API key
- 第三方 API 詳細錯誤 payload

### 不要任意更動 route params

`App.tsx` 中 `Result` route 參數被 `ScanScreen` 與 `ResultScreen` 共同依賴。若更動欄位，需同步更新所有呼叫端與型別。

## 未來優先開發項目

依效益排序：

1. 補上詐騙規則引擎測試。
2. 修正 Jest 設定與 native module mock。
3. 將詐騙規則引擎從 `ScanScreen.tsx` 拆出。
4. 建立 OpenAI 回傳 schema validation。
5. 將 OpenAI 與 SendGrid 呼叫移至後端代理服務。
6. 將語音記錄流程從 `RecordingScreen.tsx` 拆出 service。
7. 將通知副作用從 `ResultScreen` 拆出更清楚的 workflow。
8. 儲存圖片掃描歷史。
9. 改善隱私同意流程。
10. 增加正式錯誤追蹤與成本監控。

## 建議重構順序

### 第 1 階段：建立安全網

1. 修正 Jest 設定。
2. mock React Navigation、AsyncStorage、AudioRecord、ImagePicker、CalendarEvents。
3. 為 `runRuleEngine` 與 `computeFinalResult` 建立測試案例。
4. 為 `storageService` 與 `rateLimitService` 建立單元測試。

### 第 2 階段：拆出核心業務邏輯

1. 將詐騙關鍵字與白名單資料移到獨立檔案。
2. 將 `runRuleEngine` 移到 `src/services/scamRuleEngine.ts`。
3. 將 `computeFinalResult` 移到 `src/services/scamRiskScoring.ts`。
4. 讓 `ScanScreen` 只負責 UI、圖片取得與導頁。

### 第 3 階段：強化外部 API 邊界

1. 為 OpenAI response 新增 schema validation。
2. 將 prompt 與 API client 拆分。
3. 統一 API error mapping。
4. 移除或限制敏感 console log。

### 第 4 階段：拆分工作流程

1. 建立 `voiceWorkflowService`，處理轉錄、分類、儲存與行事曆寫入。
2. 建立 `scanWorkflowService`，處理圖片分析與風險計算。
3. 建立 `settingsService`，集中處理家人 Email。
4. 建立 `notificationWorkflow`，處理通知觸發、狀態與 retry。

### 第 5 階段：正式產品化架構

1. 建立後端代理服務。
2. 將 OpenAI 與 SendGrid secret 移出手機端。
3. 實作伺服器端 rate limit 與成本控管。
4. 加入隱私同意與資料刪除流程。
5. 加入錯誤追蹤與監控。

## 給 AI Agent 的快速判斷規則

- 如果任務涉及詐騙分數，先找 `ScanScreen.tsx`，但優先考慮先拆測試與服務。
- 如果任務涉及語音，先看 `RecordingScreen.tsx`、`whisperApi.ts`、`gptApi.ts`。
- 如果任務涉及通知，先看 `ResultScreen.tsx`、`notifyService.ts`、`SettingsScreen.tsx`。
- 如果任務涉及資料保存，先看 `storageService.ts` 與 AsyncStorage key。
- 如果任務涉及成本或用量，先看 `rateLimitService.ts`，但記住它只是本機限制。
- 如果任務涉及正式上線，優先處理 API key、後端代理、隱私與測試。
