/**
 * BuildFlow AI Service
 * По соображениям безопасности и архитектуры PWA на Cloudflare Pages,
 * запросы к Gemini ИИ проксируются через серверную функцию /api/process.
 * Это предотвращает утечку API ключа в клиентский код и решает проблему доступа к переменным окружения.
 */

export const processImage = async (base64Image: string) => {
  console.log("BUILDFLOW_AI: Sending image to proxy for analysis...");
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'image',
        payload: base64Image
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error("Gemini Service Error (Proxy):", err);
    throw new Error(err.message || "Не удалось связаться с ИИ. Проверьте интернет-соединение.");
  }
};

export const processVoice = async (transcript: string) => {
  console.log("BUILDFLOW_AI: Sending transcript to proxy for analysis...");
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'voice',
        payload: transcript
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error("Gemini Service Error (Proxy):", err);
    throw new Error(err.message || "Не удалось связаться с ИИ. Проверьте интернет-соединение.");
  }
};