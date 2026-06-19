import axios from 'axios';
import Config from 'react-native-config';

const OPENAI_API_KEY = Config.OPENAI_API_KEY ?? '';

const SYSTEM_PROMPT = `你的任務不是找出詐騙，而是評估風險。遇到正常日常訊息，請給予低分。

請先提取圖片中所有可見文字，再依照以下三步驟順序判斷：

【第一步：先判斷是否符合正常情境】
以下情境若符合，且同時沒有出現「匯款要求、ATM操作指令、驗證碼索取、點擊可疑網址、個資蒐集」，則 ai_score 不得超過 25：
- 銀行消費通知、信用卡刷卡通知、尾號消費紀錄
- 醫院門診提醒、掛號通知、預約確認
- 公司會議通知、地點變更通知、行程提醒
- 親友聊天、日常對話
- 物流配送通知、包裹到達、取件通知
- 水電帳單、電信帳單繳費通知

【第二步：再判斷是否有高風險特徵】
下列任一特徵出現才可提高 ai_score：
- 要求匯款或轉帳（尤其要求轉帳至私人帳戶）
- 要求至 ATM 操作（解除分期、誤設扣款）
- 要求提供驗證碼、帳戶密碼、身份證號、信用卡資料
- 要求點擊來源不明的連結
- 假冒銀行、檢察署、警察、政府機關
- 保證獲利、穩賺不賠等不合理承諾

【第三步：不確定時優先輸出資訊不足】
- 圖片不清晰、文字太少、無明確高風險特徵 → confidence 給低分（< 50），risk_level 選「資訊不足」
- 不確定時不要猜測，優先保守判斷
- 單獨出現投資、股票、理財、LINE群組、免費講座等字眼，不得判定為詐騙
- 合法金融機構、投顧、保險公司的正常宣傳不得誤判
- need_human_review 設為 true 當你認為人工判斷更可靠

輸出 JSON 格式：
{
  "ocr_text": "圖片中所有可見文字（原文逐字提取，無文字則填空字串）",
  "risk_level": "高風險|中風險|低風險|資訊不足",
  "ai_score": 0-100,
  "confidence": 0-100,
  "need_human_review": true/false,
  "evidence_high": ["具體支持高風險的證據條目"],
  "evidence_low": ["具體支持低風險的證據條目"],
  "explanation": "分析說明（繁體中文，100字以內）",
  "conclusion": "結論（繁體中文，50字以內）"
}`;

export interface ScamAnalysisResult {
  ocr_text: string;
  risk_level: '高風險' | '中風險' | '低風險' | '資訊不足';
  ai_score: number;
  confidence: number;
  need_human_review: boolean;
  evidence_high: string[];
  evidence_low: string[];
  explanation: string;
  conclusion: string;
}

export interface VoiceClassifyResult {
  type: 'expense' | 'memo' | 'calendar';
  amount?: number;
  category?: string;
  content?: string;
  date?: string;
  time?: string;
  summary: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function analyzeScamImage(imageBase64: string): Promise<ScamAnalysisResult> {
  const response = await axios.post<ChatCompletionResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: '請分析這張圖片的詐騙風險，以 JSON 格式回傳結果。',
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 768,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const content = response.data.choices[0].message.content;
  return JSON.parse(content) as ScamAnalysisResult;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildClassifySystemPrompt(): string {
  const now = new Date();
  const today = toLocalDateStr(now);
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];

  // daysFromMonday: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
  const daysFromMonday = (now.getDay() + 6) % 7;
  const nextMon = new Date(now);
  nextMon.setDate(now.getDate() + (7 - daysFromMonday));
  const nextMondayStr = toLocalDateStr(nextMon);

  const nowHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return `今天是 ${today}，星期${weekDay}，現在時間 ${nowHHmm}。
「下禮拜」= 下一週，下週一是 ${nextMondayStr}。
「下禮拜一」= ${nextMondayStr}（不是這週的週一，是下一週的週一）。
「下禮拜X」= 從 ${nextMondayStr} 起算對應的星期。
「明天」「後天」「下週」等相對日期，請以今天 ${today} 為基準計算，格式一律 YYYY-MM-DD。
「X分鐘後」「X小時後」等相對時間，請以現在 ${nowHHmm} 為基準計算。

你是台灣長輩的生活助手，請分析以下語音輸入屬於哪種類型：

【分類規則】（照優先順序判斷）
1. 有金額數字 → expense（記帳）
   例：「吃飯花了一百五」「計程車八十元」
2. 有具體時間點 → calendar（行事曆）
   包含：X點、X分、X分鐘後、X小時後、今天下午、明天早上、下週等
   例：「三分鐘後提醒喝水」「提醒我下午三點開會」「明天早上九點看醫生」
3. 沒有時間點的提醒、待辦、備註 → memo（備忘）
   例：「記得買牛奶」「提醒我打電話給女兒」（無具體時間）

回傳 JSON 格式：
{
  "type": "expense"（記帳）| "memo"（備忘）| "calendar"（行事曆）,
  "amount": 金額數字（記帳才有，純數字不含單位）,
  "category": 類別（記帳：餐費/交通/醫療/購物/其他）,
  "content": 完整備忘內容,
  "date": 日期（行事曆才有，格式 YYYY-MM-DD，若未提及則用今天 ${today}）,
  "time": 時間（行事曆才有，格式 HH:mm，「X分鐘後」請換算成實際時間）,
  "summary": 一句話摘要給長輩確認，使用繁體中文
}
請務必只回傳 JSON，不要加任何說明文字。`;
}

export async function classifyVoiceInput(text: string): Promise<VoiceClassifyResult> {
  const response = await axios.post<ChatCompletionResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildClassifySystemPrompt() },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const content = response.data.choices[0].message.content;
  return JSON.parse(content) as VoiceClassifyResult;
}
