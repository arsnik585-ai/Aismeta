import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Service
 * Strictly adheres to Google GenAI Coding Guidelines:
 * 1. Uses process.env.API_KEY for initialization.
 * 2. Uses gemini-3-flash-preview model.
 */

const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или заметок.
Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев и markdown разметки.
Поле 'type' может быть только 'MATERIAL' или 'LABOR'.
Если данных нет, верни [].`;

const ITEM_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Название позиции" },
      type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип" },
      quantity: { type: Type.NUMBER, description: "Количество" },
      unit: { type: Type.STRING, description: "Единица измерения" },
      price: { type: Type.NUMBER, description: "Цена за ед." },
      total: { type: Type.NUMBER, description: "Итоговая сумма" },
      vendor: { type: Type.STRING, description: "Магазин или исполнитель" },
    },
    required: ['name', 'type'],
  }
};

/**
 * Validates the API key presence and provides helpful debugging info for Cloudflare users.
 */
const getValidatedKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === 'undefined' || key.length < 5) {
    console.error("ENVIRONMENT ERROR: process.env.API_KEY is not available in the browser.");
    console.warn("SOLUTION: Cloudflare Pages needs the API_KEY injected at BUILD TIME.");
    console.warn("Update your build command to: export API_KEY=$API_KEY && npm run build");
    throw new Error("MISSING_API_KEY: Системе не удалось обнаружить API ключ в браузере.");
  }
  return key;
};

export const processImage = async (base64Image: string) => {
  const apiKey = getValidatedKey();
  const ai = new GoogleGenAI({ apiKey });
  
  console.log("BUILDFLOW_AI: Processing receipt image...");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Распознай все строительные позиции на этом фото чека. Сформируй JSON список." }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ITEM_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI returned an empty response.");
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Ошибка обработки данных ИИ.");
  }
};

export const processVoice = async (transcript: string) => {
  const apiKey = getValidatedKey();
  const ai = new GoogleGenAI({ apiKey });
  
  console.log("BUILDFLOW_AI: Processing voice transcript...");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Разбери строительную заметку: "${transcript}". Сформируй JSON список материалов и работ.` }]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ITEM_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI returned an empty response.");
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Ошибка обработки данных ИИ.");
  }
};