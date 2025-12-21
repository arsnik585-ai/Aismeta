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
        JSON.stringify({ error: "EMPTY_PAYLOAD", message: "Данные для анализа не получены или повреждены." }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
    Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или голосовых заметок.
    Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев.
    Если цена или количество не найдены, установи их в 0.
    Поле 'type' может быть только 'MATERIAL' или 'LABOR'.
    Если на изображении нет строительных товаров или в тексте нет смысла, верни пустой массив [].`;

    const ITEM_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Название позиции" },
        type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип: материал или работа" },
        quantity: { type: Type.NUMBER, description: "Количество" },
        unit: { type: Type.STRING, description: "Единица измерения" },
        price: { type: Type.NUMBER, description: "Цена за ед." },
        total: { type: Type.NUMBER, description: "Итоговая сумма" },
        vendor: { type: Type.STRING, description: "Магазин или исполнитель" },
      },
      required: ['name', 'type'],
    };

    const modelName = 'gemini-3-flash-preview';
    let contents;

    if (action === 'image') {
      contents = {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: payload } },
          { text: "Распознай все строительные позиции на этом фото чека. Верни JSON список." }
        ]
      };
    } else {
      contents = {
        role: 'user',
        parts: [
          { text: `Разбери строительную заметку: "${payload}". Верни JSON список материалов и работ.` }
        ]
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [contents],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ITEM_SCHEMA
        },
      }
    });

    const output = response.text;
    if (!output) {
      return new Response(
        JSON.stringify({ error: "AI_EMPTY_RESPONSE", message: "ИИ не смог распознать данные. Попробуйте другое фото." }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(output, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Execution Error:", err);
    const isOverloaded = err.message?.includes('503') || err.message?.includes('overloaded');
    return new Response(
      JSON.stringify({ 
        error: isOverloaded ? "AI_OVERLOADED" : "AI_ERROR", 
        message: isOverloaded ? "Сервер ИИ перегружен. Повтор через несколько секунд..." : (err.message || "Ошибка при обработке запроса ИИ") 
      }), 
      { status: isOverloaded ? 503 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
};