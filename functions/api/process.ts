import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // Ключ берется из переменных окружения Cloudflare Pages
  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ 
        error: "API_KEY_MISSING", 
        message: "Критическая ошибка: API_KEY не настроен в панели управления Cloudflare (Settings -> Variables)." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json() as { action: string; payload: string };
    const { action, payload } = body;

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "EMPTY_PAYLOAD", message: "Данные не получены." }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
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
      }
    };

    const modelName = 'gemini-3-flash-preview';
    let promptText = "";

    if (action === 'image') {
      promptText = "Проанализируй этот чек. Извлеки список материалов и работ в формате JSON.";
    } else {
      promptText = `Разбери строительную заметку: "${payload}". Сформируй JSON список материалов и работ.`;
    }

    const result = await ai.models.generateContent({
      model: modelName,
      contents: action === 'image' 
        ? [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: payload } }, { text: promptText }] }]
        : [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
      }
    });

    const outputText = result.text;
    if (!outputText) throw new Error("ИИ вернул пустой ответ.");

    // Проверка структуры перед отправкой
    JSON.parse(outputText);

    return new Response(outputText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Error:", err);
    return new Response(
      JSON.stringify({ 
        error: "AI_ERROR", 
        message: "Ошибка анализа: " + (err.message || "Попробуйте еще раз.")
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};