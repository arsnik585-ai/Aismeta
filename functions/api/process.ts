import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(
      JSON.stringify({ error: "Ключ API_KEY не найден в настройках Cloudflare (Variables -> Secrets)" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, payload } = await request.json() as { action: string; payload: string };

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
    Ваша задача: извлекать строительные материалы и работы из чеков или голоса.
    Верни строго массив объектов JSON. Каждое поле должно быть заполнено на основе контекста. 
    Типы могут быть только MATERIAL или LABOR.`;

    const ITEM_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'] },
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
          { text: "Проанализируй фото чека и извлеки все позиции товаров и услуг в JSON массив." }
        ]
      };
    } else {
      contents = {
        parts: [{ text: `Разбери следующую голосовую заметку на составляющие сметы: ${payload}` }]
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

    return new Response(response.text || "[]", {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Ошибка при обращении к ИИ" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};