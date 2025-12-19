
import { GoogleGenAI, Type } from "@google/genai";
import { EntryType } from "./types";

// Always use the process.env.API_KEY string directly when initializing the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `Вы — эксперт по составлению строительных смет. 
Ваша задача: анализировать входящий текст (чеки или голосовые заметки) и извлекать из них список позиций.
Контекст: исключительно строительство, ремонт, отделка и инженерные коммуникации.

Правила:
1. Классифицируй как MATERIAL: любые товары, сырье, инструменты, крепеж, расходники.
2. Классифицируй как LABOR: любые услуги, работы, аренду спецтехники, доставку или разгрузку.
3. Если количество или цена не указаны явно, старайся вычислить их логически или оставь null.
4. Исправляй опечатки, характерные для строительного сленга (например, "профиль кнауф", "ротбанд", "шпатлевка").
5. Если в одной строке несколько разных товаров, разделяй их на разные объекты.`;

const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Наименование товара или описание работы' },
    type: { type: Type.STRING, enum: [EntryType.MATERIAL, EntryType.LABOR], description: 'Классификация' },
    quantity: { type: Type.NUMBER, nullable: true },
    unit: { type: Type.STRING, nullable: true },
    price: { type: Type.NUMBER, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
    vendor: { type: Type.STRING, nullable: true, description: 'Название магазина, поставщика или исполнителя' },
  },
  required: ['name', 'type'],
};

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: ITEM_SCHEMA,
  description: 'Список всех найденных строительных позиций'
};

export const processImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Извлеки все строительные материалы и работы из этого изображения чека/документа. Верни массив JSON." }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  return JSON.parse(response.text);
};

export const processVoice = async (transcript: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Разбери эту голосовую заметку по стройке: "${transcript}". Верни массив JSON согласно схеме.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  return JSON.parse(response.text);
};

export const getProjectSummary = async (entries: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `На основе этих записей: ${entries}, предоставь краткий обзор общих затрат на материалы и работы.`,
    config: {
      systemInstruction: "Вы помощник прораба. Ваша цель — кратко и по делу анализировать расходы."
    }
  });
  return response.text;
};
