import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ 
        error: "API_KEY не настроен в переменных окружения Cloudflare." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, payload } = await request.json() as { action: string; payload: string };

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
    Ваша задача: извлекать строительные материалы и работы из чеков (фото) или голоса.
    Обязательно верни массив объектов JSON. Каждое поле должно быть заполнено на основе контекста.
    Если количество или цена не указаны, верни 0 или null (но не пропускай поля).
    Тип (type) должен быть строго 'MATERIAL' или 'LABOR'.`;

    const ITEM_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Наименование товара или услуги" },
        type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип: MATERIAL (материал) или LABOR (работа/услуга)" },
        quantity: { type: Type.NUMBER, description: "Количество" },
        unit: { type: Type.STRING, description: "Единица измерения (шт, м2, упак и т.д.)" },
        price: { type: Type.NUMBER, description: "Цена за единицу" },
        total: { type: Type.NUMBER, description: "Итоговая сумма по позиции" },
        vendor: { type: Type.STRING, description: "Продавец или исполнитель" },
      },
      required: ['name', 'type'],
      propertyOrdering: ["name", "type", "quantity", "unit", "price", "total", "vendor"]
    };

    const modelName = 'gemini-3-flash-preview';
    let parts: any[] = [];

    if (action === 'image') {
      parts = [
        { inlineData: { mimeType: 'image/jpeg', data: payload } },
        { text: "Распознай все позиции в этом чеке и сформируй список в формате JSON." }
      ];
    } else {
      parts = [
        { text: `Распознай строительные позиции из этой заметки: "${payload}". Сформируй JSON список.` }
      ];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ITEM_SCHEMA
        },
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Модель вернула пустой ответ");
    }

    return new Response(text, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Ошибка при обработке ИИ" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};