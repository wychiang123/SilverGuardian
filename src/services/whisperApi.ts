import axios from 'axios';
import Config from 'react-native-config';

const OPENAI_API_KEY = Config.OPENAI_API_KEY ?? '';

export async function transcribeAudio(filePath: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as unknown as Blob);
  formData.append('model', 'whisper-1');
  formData.append('language', 'zh');

  const response = await axios.post<{ text: string }>(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data.text;
}
