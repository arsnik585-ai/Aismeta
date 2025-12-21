import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Service (Client Side)
 */

const getAI = () => {
  // Проверяем наличие ключа в process.env как требует инструкция
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    // Выбрасываем понятную ошибку ПЕРЕД инициализацией SDK, чтобы избежать "An API Key must be set..."
    throw new Error("AI_CONFIG_ERROR: API_KEY не обнаружен. Убедитесь, что ключ настроен в окружении.");
  }
  
  return new GoogleGenAI({ apiKey });
};

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
  propertyOrdering: ["name", "type", "quantity", "unit", "price", "total", "vendor"]
};

export const processImage = async (base64Image: string) => {
  console.log("[AI_SERVICE] Initializing local analysis...");
  
  try {
    const ai = getAI();
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

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("[AI_SERVICE_ERROR] Image processing failed:", err);
    throw err;
  }
};

export const processVoice = async (transcript: string) => {
  console.log("[AI_SERVICE] Initializing voice analysis...");
  
  try {
    const ai = getAI();
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

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("[AI_SERVICE_ERROR] Voice processing failed:", err);
    throw err;
  }
};