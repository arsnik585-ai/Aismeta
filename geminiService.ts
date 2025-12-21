
import { GoogleGenAI, Type } from "@google/genai";

/**
 * BuildFlow AI Core Service (v3.0 - Final)
 */

const MODEL_NAME = 'gemini-3-flash-preview';

const SYSTEM_INSTRUCTION = `Вы — ведущий инженер-сметчик системы BuildFlow AI. 
Ваша специализация: мгновенный аудит строительных расходов.

ЗАДАЧА: Превратить хаотичный ввод (фото чека или текст аудио-заметки) в чистый структурированный JSON-список.

ПРАВИЛА ОБРАБОТКИ:
1. Классификация:
   - MATERIAL: Физические товары, стройматериалы, расходники, инструменты.
   - LABOR: Услуги мастеров, доставка, подъем на этаж, аренда техники, вывоз мусора.
2. Очистка данных: Убирайте из названий артикулы и технический мусор. Пишите понятно.
3. Цены: Если цена за единицу не указана, вычислите её из общего итога. Все суммы в RUB (₽).
4. Ошибки: Если данных нет или они нечитаемы, возвращайте пустой массив [].

ВЕРНИТЕ ТОЛЬКО JSON МАССИВ. БЕЗ ТЕКСТА ДО И ПОСЛЕ.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Название товара или услуги" },
      type: { type: Type.STRING, enum: ['MATERIAL', 'LABOR'], description: "Тип: материал или работа" },
      quantity: { type: Type.NUMBER, description: "Количество" },
      unit: { type: Type.STRING, description: "Единица измерения (шт, м2, кг...)" },
      price: { type: Type.NUMBER, description: "Цена за 1 единицу" },
      total: { type: Type.NUMBER, description: "Итоговая сумма по позиции" },
      vendor: { type: Type.STRING, description: "Магазин, рынок или исполнитель" },
    },
    required: ['name', 'type', 'quantity', 'price', 'total'],
  },
};

export const BuildFlowAssistant = {
  async analyzeReceipt(base64Image: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const result = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Просканируй этот строительный документ. Извлеки все материалы и услуги." }
          ]
        }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        }
      });

      return this._safeParse(result.text);
    } catch (error: any) {
      console.error("[AI_RECEIPT_ERROR]", error);
      throw new Error(this._handleError(error));
    }
  },

  async analyzeVoiceNote(transcript: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const result = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [{ text: `Разбери диктовку по закупкам/работам: "${transcript}"` }]
        }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        }
      });

      return this._safeParse(result.text);
    } catch (error: any) {
      console.error("[AI_VOICE_ERROR]", error);
      throw new Error(this._handleError(error));
    }
  },

  _safeParse(text: string | undefined) {
    if (!text) return [];
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.error("[AI_JSON_PARSE_FAILED]", text);
      return [];
    }
  },

  _handleError(error: any) {
    if (error.message?.includes("API_KEY")) return "Проблема с ключом доступа ассистента";
    return "Ассистент временно недоступен";
  }
};
