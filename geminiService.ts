import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Service
 * Strictly adheres to Google GenAI Coding Guidelines:
 * 1. Uses process.env.API_KEY for initialization.
 * 2. Uses gemini-3-flash-preview model as required.
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

export const processImage = async (base64Image: string) => {
  // Инициализация внутри функции гарантирует доступ к актуальному окружению
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Ошибка парсинга ответа ИИ.");
  }
};

export const processVoice = async (transcript: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Ошибка парсинга ответа ИИ.");
  }
};