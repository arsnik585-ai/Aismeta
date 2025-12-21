import { GoogleGenAI, Type } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  // Проверка наличия ключа в окружении Cloudflare
  if (!env.API_KEY) {
    return new Response(JSON.stringify({ error: "API_KEY not found in environment" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { action, payload } = await request.json();

    // Шимминг process.env для соответствия требованиям SDK
    (globalThis as any).process = { env: { API_KEY: env.API_KEY } };

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — эксперт BuildFlow AI. 
    Ваша задача: извлекать строительные материалы и работы из чеков или голоса.
    Верни строго массив объектов JSON.`;

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
          { text: "Извлеки все товары и цены в JSON массив." }
        ]
      };
    } else {
      contents = {
        parts: [{ text: `Разбери эту строительную заметку: ${payload}` }]
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

    return new Response(response.text, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Worker Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};