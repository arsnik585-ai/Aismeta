import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ error: "API_KEY_MISSING", message: "Системная ошибка: API ключ не настроен." }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json() as { action: string; payload: string };
    const { action, payload } = body;

    if (!payload || payload.length < 5) {
      return new Response(
        JSON.stringify({ error: "EMPTY_PAYLOAD", message: "Данные не получены. Попробуйте еще раз." }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
    Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или голосовых заметок.
    Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев, markdown разметки или пояснений.
    Если цена или количество не найдены, установи их в 0.
    Поле 'type' может быть только 'MATERIAL' или 'LABOR'.`;

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
    let contents;

    if (action === 'image') {
      contents = {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: payload } },
          { text: "Извлеки список позиций в формате JSON." }
        ]
      };
    } else {
      contents = {
        role: 'user',
        parts: [
          { text: `Разбери заметку: "${payload}". Верни JSON список материалов и работ.` }
        ]
      };
    }

    const result = await ai.models.generateContent({
      model: modelName,
      contents: [contents],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
      }
    });

    let outputText = "";
    try {
      outputText = result.text?.trim() || "";
    } catch (e) {
      console.error("Error getting text from Gemini result:", e);
      return new Response(
        JSON.stringify({ error: "AI_TEXT_ERROR", message: "ИИ не смог сформировать текстовый ответ." }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!outputText) {
      return new Response(
        JSON.stringify({ error: "AI_EMPTY", message: "ИИ вернул пустой ответ. Попробуйте еще раз." }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Финальная проверка валидности JSON перед отправкой
    try {
      JSON.parse(outputText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "INVALID_JSON", message: "Ошибка структуры данных ИИ. Повторите попытку." }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(outputText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Global Error:", err);
    return new Response(
      JSON.stringify({ 
        error: "SERVER_ERROR", 
        message: err.message || "Внутренняя ошибка сервера при обработке запроса." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
