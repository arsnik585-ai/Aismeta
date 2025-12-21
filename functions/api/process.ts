import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // Проверка ключа
  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ error: "Критическая ошибка: API_KEY не настроен в Cloudflare." }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, payload } = await request.json() as { action: string; payload: string };

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
    Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или голосовых заметок.
    Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев или markdown-разметки.
    Если цена или количество не найдены, установи их в 0.
    Поле 'type' может быть только 'MATERIAL' или 'LABOR'.`;

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
          { text: "Распознай все товары и услуги в этом документе и представь их в виде списка объектов JSON." }
        ]
      };
    } else {
      contents = {
        role: 'user',
        parts: [
          { text: `Разбери эту строительную заметку: "${payload}". Извлеки список материалов и работ в формате JSON.` }
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
    if (!output) throw new Error("ИИ вернул пустой результат");

    return new Response(output, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Execution Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Ошибка при обработке запроса ИИ" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};