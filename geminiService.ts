import { GoogleGenAI, Type } from "@google/genai";

// Эта функция возвращает строку, которая будет заменена на реальный ключ во время сборки в Netlify
const getApiKey = () => {
  return process.env.API_KEY;
};

const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
Ваша задача: извлекать строительные материалы и работы из чеков или голоса.
Верни строго массив объектов JSON.`;

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

export const processImage = async (base64Image: string) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Извлеки все товары и цены в JSON массив." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ITEM_SCHEMA
        },
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (err) {
    console.error("Gemini Image Error:", err);
    throw err;
  }
};

export const processVoice = async (transcript: string) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Разбери эту строительную заметку: ${transcript}` }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ITEM_SCHEMA
        },
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (err) {
    console.error("Gemini Voice Error:", err);
    throw err;
  }
};