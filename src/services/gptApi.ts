import axios from 'axios';
import Config from 'react-native-config';

const OPENAI_API_KEY = Config.OPENAI_API_KEY ?? '';

const SYSTEM_PROMPT = `你是台灣防詐騙專家。請分析使用者提供的圖片，判斷是否含有詐騙內容。
分析重點：假冒政府機關、銀行或知名品牌；要求轉帳或點擊不明連結；中獎通知；威脅恐嚇語言；不合理的優惠或高報酬投資。
請以繁體中文回覆，嚴格回傳 JSON 格式：{"isSafe": true/false, "message": "說明（50字以內）"}`;

interface GptResult {
  isSafe: boolean;
  message: string;
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

export async function analyzeScamImage(imageBase64: string): Promise<GptResult> {
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
              text: '請分析這張圖片是否為詐騙，以 JSON 格式回傳結果。',
            },
          ],
        },
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
  return JSON.parse(content) as GptResult;
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
