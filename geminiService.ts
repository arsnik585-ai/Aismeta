import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Service
 * Использует process.env.API_KEY напрямую согласно системным требованиям.
 */

const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или голосовых заметок.
Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев и markdown разметки.
Поле 'type' может быть только 'MATERIAL' или 'LABOR'.
Если данные не найдены, верни [].`;

const ITEM_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Название позиции" },
      type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип" },
      quantity: { type: Type.NUMBER, description: "Количество" },
      unit: { type: Type.STRING, description: "Ед. изм." },
      price: { type: Type.NUMBER, description: "Цена" },
      total: { type: Type.NUMBER, description: "Итого" },
      vendor: { type: Type.STRING, description: "Поставщик" },
    },
    required: ['name', 'type'],
  },
};

export const processImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ 
        role: 'user', 
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }, 
          { text: "Проанализируй этот чек. Извлеки список материалов и работ в формате JSON." }
        ] 
      }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
      }
    });

    if (!response.text) throw new Error("ИИ вернул пустой ответ");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("[AI_ERROR]", err);
    throw new Error(err.message || "Ошибка при обработке изображения");
  }
};

export const processVoice = async (transcript: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Разбери строительную заметку: "${transcript}". Сформируй JSON список материалов и работ.` }] 
      }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
      }
    });

    if (!response.text) throw new Error("ИИ вернул пустой ответ");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("[AI_ERROR]", err);
    throw new Error(err.message || "Ошибка при обработке голоса");
  }
};