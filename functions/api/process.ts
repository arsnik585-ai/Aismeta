import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  console.log("[WORKER_DIAGNOSTIC] Request received");

  // Проверка ключа в env
  if (!env.API_KEY || env.API_KEY === 'undefined' || env.API_KEY === '') {
    console.error("[WORKER_ERROR] API_KEY is missing in env variables");
    return new Response(
      JSON.stringify({ 
        error: "WORKER_CONFIG_ERROR", 
        message: "API_KEY не найден в Cloudflare Env. Проверьте Settings -> Variables в панели Cloudflare." 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json() as { action: string; payload: string };
    const { action, payload } = body;

    console.log(`[WORKER_DIAGNOSTIC] Action: ${action}, Payload size: ${payload?.length || 0}`);

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "EMPTY_PAYLOAD", message: "Payload is empty" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Инициализация ИИ с проверкой
    let ai;
    try {
      ai = new GoogleGenAI({ apiKey: env.API_KEY });
      console.log("[WORKER_DIAGNOSTIC] GoogleGenAI instance created successfully");
    } catch (aiInitErr: any) {
      console.error("[WORKER_ERROR] Failed to initialize GoogleGenAI:", aiInitErr.message);
      return new Response(
        JSON.stringify({ error: "AI_INIT_FAIL", message: `Ошибка инициализации SDK: ${aiInitErr.message}` }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const SYSTEM_INSTRUCTION = `Вы — ведущий инженер BuildFlow AI. 
    Ваша задача: извлекать строительные материалы (MATERIAL) и работы (LABOR) из чеков или голосовых заметок.
    Верни СТРОГО массив объектов JSON. Не добавляй никаких комментариев и markdown разметки.
    Поле 'type' может быть только 'MATERIAL' или 'LABOR'.
    Если данные не найдены, верни [].`;

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
    let promptText = "";

    if (action === 'image') {
      promptText = "Проанализируй этот чек. Извлеки список материалов и работ в формате JSON.";
    } else {
      promptText = `Разбери строительную заметку: "${payload}". Сформируй JSON список материалов и работ.`;
    }

    console.log("[WORKER_DIAGNOSTIC] Calling ai.models.generateContent...");

    const result = await ai.models.generateContent({
      model: modelName,
      contents: action === 'image' 
        ? [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: payload } }, { text: promptText }] }]
        : [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
      }
    });

    const outputText = result.text;
    console.log("[WORKER_DIAGNOSTIC] AI response received");

    if (!outputText) throw new Error("Empty text in AI response");

    return new Response(outputText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[WORKER_EXCEPTION]", err);
    return new Response(
      JSON.stringify({ 
        error: "AI_EXECUTION_ERROR", 
        message: err.message || "Unknown internal error"
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};