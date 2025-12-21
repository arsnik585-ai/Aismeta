import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // Проверка наличия ключа в Secrets панели управления Cloudflare
  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ 
        error: "API_KEY не настроен. Пожалуйста, добавьте его в Settings -> Variables and Secrets в панели Cloudflare Pages." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, payload } = await request.json() as { action: string; payload: string };

    // Инициализация Gemini API
    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
    Ваша задача: извлекать строительные материалы и работы из чеков (фото) или голоса.
    Верни строго массив объектов JSON. Каждое поле должно быть заполнено на основе предоставленного контекста.
    Поле 'type' может принимать только значения 'MATERIAL' или 'LABOR'.`;

    const ITEM_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Название позиции" },
        type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Материал или работа" },
        quantity: { type: Type.NUMBER, nullable: true, description: "Количество" },
        unit: { type: Type.STRING, nullable: true, description: "Единица измерения" },
        price: { type: Type.NUMBER, nullable: true, description: "Цена за единицу" },
        total: { type: Type.NUMBER, nullable: true, description: "Итоговая сумма по позиции" },
        vendor: { type: Type.STRING, nullable: true, description: "Поставщик или исполнитель" },
      },
      required: ['name', 'type'],
    };

    const modelName = 'gemini-3-flash-preview';
    let contents;

    if (action === 'image') {
      contents = {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: payload } },
          { text: "Найди все товары и услуги в этом чеке и выведи их списком в формате JSON." }
        ]
      };
    } else {
      contents = {
        parts: [{ text: `Проанализируй следующую строительную заметку и извлеки данные для сметы: ${payload}` }]
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
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

    const result = response.text || "[]";
    return new Response(result, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Execution Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Произошла ошибка при обработке данных через ИИ" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};