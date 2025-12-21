import { GoogleGenAI, Type } from "@google/genai";

export const onRequestPost = async (context: { request: Request }) => {
  const { request } = context;
  const API_KEY = process.env.API_KEY || "AIzaSyAJxr6Wob4etFjLsjTzSTXn9v52mgqa9iQ";

  try {
    const body = await request.json() as { action: string; payload: string };
    const { action, payload } = body;

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "EMPTY_PAYLOAD", message: "Payload is required" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const SYSTEM_INSTRUCTION = `Вы — экспертный ИИ-ассистент BuildFlow. Специализация: строительный аудит и OCR чеков. 
    Верните СТРОГО массив JSON. Классификация: MATERIAL или LABOR. Цены в RUB.`;

    const RESPONSE_SCHEMA = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'] },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          price: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          vendor: { type: Type.STRING },
        },
        required: ['name', 'type', 'quantity', 'price', 'total'],
      }
    };

    const modelName = 'gemini-3-flash-preview';
    
    const result = await ai.models.generateContent({
      model: modelName,
      contents: action === 'image' 
        ? [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: payload } }, { text: "Извлеки позиции из этого строительного чека." }] }]
        : [{ role: 'user', parts: [{ text: `Разбери строительную заметку: "${payload}"` }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      }
    });

    return new Response(result.text, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[Worker_Error]", err);
    return new Response(
      JSON.stringify({ error: "ASSISTANT_CRASH", message: err.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};