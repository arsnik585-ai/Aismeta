import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Service
 * Использует прямой доступ к Gemini API через SDK.
 * process.env.API_KEY предоставляется средой выполнения.
 */

const getAIModel = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  return ai;
};

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

export const processImage = async (base64Image: string) => {
  try {
    const ai = getAIModel();
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
    if (!text) throw new Error("ИИ вернул пустой ответ.");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("AI Image Processing Error:", err);
    throw new Error(err.message || "Ошибка при анализе изображения");
  }
};

export const processVoice = async (transcript: string) => {
  try {
    const ai = getAIModel();
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
    if (!text) throw new Error("ИИ вернул пустой ответ.");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("AI Voice Processing Error:", err);
    throw new Error(err.message || "Ошибка при разборе текста");
  }
};
