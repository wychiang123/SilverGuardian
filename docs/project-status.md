# 專案狀態報告

本文件根據目前 SilverGuardian 專案程式碼與以下文件推導：

- `README.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/agent-guide.md`
- `docs/mvp-analysis.md`

> 百分比為根據目前程式碼與文件的主觀估算，用於協助決策，不代表正式驗收數字。

## 1. 專案目前完成度

整體專案完成度估算：**45%**

估算理由：

- 主要畫面與流程雛形已存在。
- 圖片詐騙辨識、語音記錄、歷史記錄、家人通知、設定頁皆有初步實作。
- Android 與 iOS 專案結構已存在。
- 但測試環境尚未穩定，核心業務邏輯缺少測試。
- 外部 API 金鑰仍由手機端直接使用，正式產品化風險高。
- 缺少後端、正式隱私流程、錯誤追蹤、成本控管與 beta 級品質保證。

## 2. MVP 完成度

MVP 完成度估算：**65%**

此處 MVP 定義為：

> 長者友善的圖片詐騙辨識與家人通知工具。

估算理由：

- MVP 核心閉環已有雛形：拍照或選圖、AI 分析、規則判斷、結果顯示、高風險通知家人。
- 設定家人 Email 已完成基本版本。
- 但 Jest 測試目前無法穩定執行，核心規則沒有測試保護。
- OpenAI 回傳缺少 schema validation。
- 高風險通知仍直接從手機端呼叫 SendGrid。
- 結果頁仍含 debug 資訊，正式使用者體驗需整理。

## 3. 已完成功能

### App 基礎

- React Native 專案結構。
- Android 與 iOS 原生專案。
- React Navigation stack 導覽。
- TypeScript 設定。
- 首頁入口。

### 圖片詐騙辨識

- 相機拍照。
- 相簿選圖。
- 圖片 base64 讀取。
- OpenAI 圖片分析。
- 本機詐騙關鍵字與規則引擎。
- AI 分數與規則分數合併。
- 高、中、低、資訊不足風險等級。
- 結果頁顯示分數、證據、說明、結論與信心分數。

### 家人通知

- 設定最多 3 組家人 Email。
- 高風險時嘗試透過 SendGrid 發送通知。
- 顯示通知狀態。

### 語音記錄

- 錄音權限請求。
- 按住錄音。
- Whisper 語音轉文字。
- OpenAI 分類支出、備忘、行事曆。
- 使用者確認後儲存。
- 行事曆事件嘗試寫入手機行事曆。

### 本機資料

- AsyncStorage 儲存歷史記錄。
- 歷史頁列表。
- 刪除記錄。
- 本機每日使用次數限制。

### 文件

- README。
- 需求文件。
- 架構文件。
- Roadmap。
- AI Agent 接手指南。
- MVP 分析。

## 4. 尚未完成功能

### MVP 尚缺

- Jest 測試穩定執行。
- 詐騙規則引擎單元測試。
- OpenAI 回傳資料 schema validation。
- 結果頁正式模式整理，例如移除或隱藏 debug 資訊。
- 更完整的錯誤處理與長者友善提示。
- 敏感 console log 管理。

### Beta 或正式產品尚缺

- 後端代理服務。
- OpenAI 與 SendGrid 金鑰移出手機端。
- 伺服器端 rate limit 與成本控管。
- 隱私同意流程。
- 資料保存與刪除政策。
- 錯誤追蹤與監控。
- API 失敗重試策略。
- 掃描歷史保存。
- 更完整的照護者模式。
- 真實裝置測試與跨平台驗證。

## 5. 技術債

1. `ScanScreen.tsx` 同時包含 UI、權限、圖片處理、AI 呼叫、規則引擎與分數計算。
2. `RecordingScreen.tsx` 同時包含 UI、錄音、轉錄、AI 分類、儲存與行事曆流程。
3. OpenAI prompt、API 呼叫、回傳解析與型別定義集中在 `gptApi.ts`。
4. AI 回傳直接 `JSON.parse`，缺少 schema validation。
5. Jest 設定不足，React Navigation ESM 與 native module mock 尚未處理。
6. 核心詐騙規則缺少測試。
7. 手機端直接持有 OpenAI 與 SendGrid API key。
8. 本機 rate limit 不足以作為正式成本控管。
9. 部分 console log 可能輸出敏感資料。
10. `family_emails` 等 storage key 分散在不同模組。

## 6. 高風險項目

### 最高風險

- 手機端直接使用 OpenAI 與 SendGrid API key。若公開發布，金鑰可能被擷取或濫用。
- 詐騙規則與分數計算沒有測試。任何修改都可能造成誤判。
- Jest 目前無法穩定作為自動維護基礎。

### 中高風險

- OpenAI 回傳格式不穩時可能造成流程失敗。
- 高風險通知在結果頁 lifecycle 中觸發，可能因畫面行為而重複或失敗。
- 敏感資料可能出現在 console log。
- 缺少隱私告知與資料處理說明。

### 中風險

- 本機 AsyncStorage rate limit 可被清除。
- 語音流程 side effect 多，未測試時不易維護。
- Native module 測試 mock 尚未建立。

## 7. 最值得優先完成的三項工作

### 1. 修復 Jest 測試環境

原因：

- 這是未來 Claude Code、Codex、OpenHands 自動維護的基礎。
- 沒有穩定測試，就無法安全重構核心邏輯。

目標：

- `npm test` 可穩定執行。
- React Navigation 與 native modules 有基本 mock。

### 2. 拆出並測試詐騙規則引擎

原因：

- 這是 SilverGuardian 最核心的業務邏輯。
- 目前藏在 `ScanScreen.tsx`，維護風險最高。

目標：

- 將 `runRuleEngine`、`computeFinalResult`、風險等級判斷拆出。
- 建立高、中、低、資訊不足、白名單、高風險 anchor 測試案例。

### 3. 強化 OpenAI 回傳驗證與錯誤處理

原因：

- 目前直接 `JSON.parse`。
- 模型回傳格式不穩會影響核心流程。

目標：

- 加入基本 schema validation。
- 分數欄位限制在合理範圍。
- 缺欄位時提供 fallback。
- 使用者看到友善錯誤提示。

## 8. 如果只有 20 小時開發時間，建議如何分配

### 第 1 到 5 小時：修復測試基礎

- 調整 Jest 設定。
- 加入 React Navigation 轉譯設定。
- mock native modules。
- 確認 `npm test` 可穩定執行。

預期產出：

- App smoke test 可通過。
- 後續重構有基本安全網。

### 第 6 到 11 小時：拆出詐騙規則並補測試

- 從 `ScanScreen.tsx` 拆出規則引擎。
- 補高風險、中風險、低風險、資訊不足測試。
- 補白名單與高風險 anchor 測試。

預期產出：

- 核心判斷邏輯可被單元測試保護。
- 未來 AI Agent 可以較安全地改規則。

### 第 12 到 15 小時：OpenAI 回傳防呆

- 為圖片分析結果與語音分類結果建立基本驗證。
- 處理 JSON parse 失敗。
- 補 API 失敗或格式錯誤測試。

預期產出：

- 外部模型回傳異常時不會讓流程直接崩潰。

### 第 16 到 18 小時：MVP 使用者體驗整理

- 結果頁隱藏或整理 debug 資訊。
- 改善高風險、低信心、資訊不足提示。
- 檢查權限拒絕與網路錯誤文案。

預期產出：

- Demo 體驗更像實際產品。

### 第 19 到 20 小時：安全與文件同步

- 移除或限制敏感 console log。
- 更新文件中的目前狀態與測試方式。
- 標註 API key 風險與正式化前必要事項。

預期產出：

- 專案更適合交給後續 AI Agent 或開發者接手。

## 9. 是否已達到可展示 Demo 階段

判斷：**接近可展示 Demo，但建議先完成少量整理。**

理由：

- 核心畫面與主要流程已存在。
- 圖片掃描到結果顯示已有閉環。
- 高風險通知也有初步實作。

但 Demo 前建議至少處理：

- 確認真機或模擬器可跑完整圖片掃描流程。
- 隱藏或整理 debug 資訊。
- 確認 API key 與 SendGrid 設定可用。
- 準備幾張可控測試圖片。
- 確認錯誤提示不會暴露過多技術細節。

Demo 評估：**可以內部展示，不建議直接對外公開展示。**

## 10. 是否已達到可公開測試 Beta 階段

判斷：**尚未達到 Beta 階段。**

主要原因：

- 測試環境尚未穩定。
- 核心詐騙判斷沒有測試覆蓋。
- 手機端直接持有 API key。
- 缺少隱私同意與資料處理說明。
- 缺少正式錯誤追蹤與監控。
- 外部 API 回傳缺少 schema validation。
- 尚未看到足夠的跨裝置、跨平台驗證。

若要進入 Beta，至少需要：

- `npm test` 穩定通過。
- 核心詐騙判斷有測試。
- API key 移至後端或至少建立受控測試機制。
- 敏感 log 清理。
- 補上隱私與資料使用說明。
- 完成真機測試。

## 一句話評價

目前 SilverGuardian 最大的瓶頸是：**核心防詐流程已具雛形，但缺少測試、安全邊界與模組拆分，導致它還不能被放心地自動維護或公開測試。**
