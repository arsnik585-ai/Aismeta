import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Core Service (v2.0)
 * Полностью переписанная логика ассистента для глубокого анализа строительных данных.
 */

const MODEL_NAME = 'gemini-3-flash-preview';

const SYSTEM_INSTRUCTION = `Вы — экспертный ИИ-ассистент BuildFlow, специализирующийся на аудите строительных смет и распознавании чеков.
ВАША ЗАДАЧА: Преобразовать неструктурированный ввод (фото чека или текст голосовой заметки) в структурированный массив JSON.

ПРАВИЛА ОБРАБОТКИ:
1. Каждая позиция должна быть классифицирована как MATERIAL (товар, расходник) или LABOR (услуга, работа, аренда).
2. Очищайте названия от лишнего шума (артикулы, сокращения касс), но сохраняйте суть (например, "Клей плит. Кнауф 25кг").
3. Если количество или цена не указаны явно, делайте разумное предположение (по умолчанию количество 1).
4. Валюта всегда RUB (₽).
5. Если вводе нет полезных данных, верните пустой массив [].

ВЕРНИТЕ ТОЛЬКО ЧИСТЫЙ JSON МАССИВ.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Наименование материала или работы" },
      type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип позиции" },
      quantity: { type: Type.NUMBER, description: "Количественный показатель" },
      unit: { type: Type.STRING, description: "Единица измерения (шт, м2, мп, кг, меш и т.д.)" },
      price: { type: Type.NUMBER, description: "Цена за единицу" },
      total: { type: Type.NUMBER, description: "Общая сумма по позиции" },
      vendor: { type: Type.STRING, description: "Место приобретения или исполнитель" },
    },
    required: ['name', 'type', 'quantity', 'price', 'total'],
  },
};

export const BuildFlowAssistant = {
  /**
   * Обработка изображений (OCR + Анализ)
   */
  async analyzeReceipt(base64Image: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Извлеки все позиции из этого строительного чека/накладной. Сформируй детальный список." }
          ]
        }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        }
      });

      return this._parseResponse(response.text);
    } catch (error: any) {
      console.error("[Assistant_Receipt_Error]", error);
      throw new Error(this._mapError(error));
    }
  },

  /**
   * Обработка текста (Голосовые заметки)
   */
  async analyzeVoiceNote(transcript: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [{ text: `Разбери голосовую заметку прораба: "${transcript}". Выдели материалы и работы.` }]
        }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        }
      });

      return this._parseResponse(response.text);
    } catch (error: any) {
      console.error("[Assistant_Voice_Error]", error);
      throw new Error(this._mapError(error));
    }
  },

  _parseResponse(text: string | undefined) {
    if (!text) return [];
    try {
      const cleanJson = text.trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("[JSON_Parse_Error]", text);
      return [];
    }
  },

  _mapError(error: any) {
    if (error.message?.includes("API_KEY")) return "Ошибка авторизации ассистента";
    if (error.message?.includes("safety")) return "Контент заблокирован фильтрами безопасности";
    return error.message || "Сбой ассистента при обработке";
  }
};