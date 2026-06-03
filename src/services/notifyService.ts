import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENDGRID_API_KEY = Config.SENDGRID_API_KEY ?? '';
const FROM_EMAIL = Config.SENDGRID_FROM_EMAIL ?? '';

export async function notifyFamily(
  scamMessage: string,
  imageDescription: string,
): Promise<boolean> {
  const raw = await AsyncStorage.getItem('family_emails');
  if (!raw) return false;

  let emails: string[] = [];
  try {
    emails = JSON.parse(raw) as string[];
  } catch {
    return false;
  }

  const validEmails = emails.filter(e => e && e.includes('@'));
  if (validEmails.length === 0) return false;

  const htmlBody = `
<div style="font-family:sans-serif;font-size:16px;color:#333;">
  <h2 style="color:#c62828;">⚠️ 銀髮守護者警告</h2>
  <p>您的家人使用銀髮守護者 APP 時，偵測到可疑詐騙內容。</p>
  <hr/>
  <h3>📋 AI 分析結果</h3>
  <p>${scamMessage}</p>
  <h3>📷 圖片描述</h3>
  <p>${imageDescription}</p>
  <hr/>
  <p style="color:#c62828;font-weight:bold;">⚠️ 請立即聯繫您的家人，確認他們的安全！</p>
  <p style="color:#888;font-size:13px;">此訊息由銀髮守護者自動發送</p>
</div>`;

  const personalizations = validEmails.map(email => ({ to: [{ email }] }));

  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations,
      from: { email: FROM_EMAIL, name: '銀髮守護者' },
      subject: '⚠️ 銀髮守護者警告：偵測到詐騙訊息',
      content: [{ type: 'text/html', value: htmlBody }],
    },
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return true;
}
