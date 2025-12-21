/**
 * Фронтенд-сервис BuildFlow AI.
 * Теперь все запросы проходят через безопасный прокси /api/process (Cloudflare Worker),
 * что скрывает API_KEY от конечного пользователя.
 */

export const processImage = async (base64Image: string) => {
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'image', payload: base64Image })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Ошибка сервера при анализе изображения');
    }

    return await response.json();
  } catch (err) {
    console.error("Frontend Process Image Error:", err);
    throw err;
  }
};

export const processVoice = async (transcript: string) => {
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'voice', payload: transcript })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Ошибка сервера при анализе голоса');
    }

    return await response.json();
  } catch (err) {
    console.error("Frontend Process Voice Error:", err);
    throw err;
  }
};