import axios from 'axios';
import Config from 'react-native-config';

const OPENAI_API_KEY = Config.OPENAI_API_KEY ?? '';

const SYSTEM_PROMPT = `你是台灣防詐騙分析專家。請先提取圖片中所有可見文字，再獨立評估詐騙風險等級。

【白名單——以下屬於正常訊息，不得判定為詐騙】
- 銀行消費通知、信用卡帳單、刷卡確認簡訊
- 醫院掛號通知、門診提醒、回診通知
- 物流配送通知、包裹到達、取件通知
- 公司/學校會議或課程通知
- 親友一般聊天訊息
- 水電費、電信帳單繳費通知

【高風險特徵——以下才是詐騙依據】
- 要求匯款、轉帳到私人帳戶或 ATM
- 假冒銀行、檢察署、警察、政府機關
- 索取驗證碼、帳戶密碼、信用卡資料、身份證號
- 保證獲利、穩賺不賠等不合理報酬承諾
- ATM 解除分期、誤設扣款等操作要求

【嚴格禁止】
- 單獨出現「投資」「股票」「理財」「LINE群組」「免費講座」等字眼，不得判定為詐騙，必須同時有其他明確高風險特徵。
- 合法投顧、金融機構、保險公司、證券商的宣傳內容不得誤判。
- 不確定時請優先輸出「資訊不足」，不要猜測。
- 圖片文字不清晰、內容不完整、無明確高風險特徵時，confidence 請給低分（< 50）並選「資訊不足」。
- need_human_review 設為 true 當你認為人工判斷更可靠。

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

const CLASSIFY_SYSTEM_PROMPT = (() => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  return `今天日期是 ${todayStr}，星期${weekDay}。請根據今天日期計算相對日期（下禮拜、明天、後天等）。

你是台灣長輩的生活助手，請分析以下語音輸入屬於哪種類型，並提取關鍵資訊。
回傳 JSON 格式：
{
  "type": "expense"（記帳）| "memo"（備忘）| "calendar"（行事曆）,
  "amount": 金額數字（記帳才有，純數字不含單位）,
  "category": 類別（記帳：餐費/交通/醫療/購物/其他）,
  "content": 完整備忘內容,
  "date": 日期（行事曆才有，格式 YYYY-MM-DD，若未提及則用今天）,
  "time": 時間（行事曆才有，格式 HH:mm，若未提及則省略）,
  "summary": 一句話摘要給長輩確認，使用繁體中文
}
請務必只回傳 JSON，不要加任何說明文字。`;
})();

export async function classifyVoiceInput(text: string): Promise<VoiceClassifyResult> {
  const response = await axios.post<ChatCompletionResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
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
