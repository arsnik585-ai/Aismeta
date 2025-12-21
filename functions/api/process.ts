import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ 
        error: "API_KEY не настроен. Добавьте его в Settings -> Variables and Secrets в панели Cloudflare Pages." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, payload } = await request.json() as { action: string; payload: string };

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
        quantity: { type: Type.NUMBER, nullable: true },
        unit: { type: Type.STRING, nullable: true },
        price: { type: Type.NUMBER, nullable: true },
        total: { type: Type.NUMBER, nullable: true },
        vendor: { type: Type.STRING, nullable: true },
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

    return new Response(response.text || "[]", {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Execution Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Ошибка ИИ при обработке запроса" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};