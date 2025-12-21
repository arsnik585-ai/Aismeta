import { GoogleGenAI, Type } from "@google/genai";

export const onRequestPost = async (context: { request: Request; env: { API_KEY: string } }) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(JSON.stringify({ error: "Ключ API_KEY не настроен в переменных Cloudflare" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { action, payload } = await request.json() as { action: string, payload: string };

    // Инициализация AI прямо в функции
    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
    Ваша задача: извлекать строительные материалы и работы из чеков или голоса.
    Верни строго массив объектов JSON. Каждое поле должно быть заполнено на основе контекста.`;

    const ITEM_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Название материала или работы" },
        type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип: МАТЕРИАЛ или РАБОТА" },
        quantity: { type: Type.NUMBER, nullable: true },
        unit: { type: Type.STRING, nullable: true },
        price: { type: Type.NUMBER, nullable: true },
        total: { type: Type.NUMBER, nullable: true },
        vendor: { type: Type.STRING, nullable: true },
      },
      required: ['name', 'type'],
    };

    const model = 'gemini-3-flash-preview';
    let contents;

    if (action === 'image') {
      contents = {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: payload } },
          { text: "Извлеки все товары, услуги и цены в JSON массив. Если цена не указана, поставь null." }
        ]
      };
    } else {
      contents = {
        parts: [{ text: `Проанализируй текст и выдели позиции для сметы: ${payload}` }]
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ITEM_SCHEMA
        },
      }
    });

    const resultText = response.text || "[]";
    return new Response(resultText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Ошибка сервера при обработке ИИ" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};