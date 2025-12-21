import { GoogleGenAI, Type } from "@google/genai";

// ВАЖНО: Строка process.env.API_KEY будет заменена на реальный ключ во время сборки в Netlify
// Если после деплоя вы видите ошибку 'API_KEY is not defined', значит в Netlify не была запущена сборка (Clear cache and deploy).
const getApiKey = () => {
  return process.env.API_KEY;
};

const SYSTEM_INSTRUCTION = `Вы — ИИ-ассистент BuildFlow. Эксперт в строительных сметах.
Ваша задача: извлекать данные о материалах и работах.
Типы: MATERIAL или LABOR.
Обязательно вычисляй total.`;

const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'] },
    quantity: { type: Type.NUMBER, nullable: true },
    unit: { type: Type.STRING, nullable: true },
    price: { type: Type.NUMBER, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
    vendor: { type: Type.STRING, nullable: true },
  },
  required: ['name', 'type'],
};

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: ITEM_SCHEMA
};

export const processImage = async (base64Image: string) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Извлеки строительные позиции из чека в JSON." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (err: any) {
    console.error("AI Error:", err);
    throw new Error("Ошибка ИИ. Проверьте лимиты ключа или деплой.");
  }
};

export const processVoice = async (transcript: string) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Разбери заметку: "${transcript}"` }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (err: any) {
    console.error("AI Error:", err);
    throw new Error("Ошибка разбора голоса.");
  }
};