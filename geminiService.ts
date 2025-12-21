/**
 * BuildFlow AI Service (Client Side)
 * This service ONLY communicates with the server-side Cloudflare Worker.
 * DO NOT import @google/genai here to avoid "API Key required in browser" errors.
 */

const log = (msg: string, data?: any) => {
  console.log(`%c[AI_SERVICE] ${msg}`, 'color: #10b981; font-weight: bold', data || '');
};

const errLog = (msg: string, data?: any) => {
  console.error(`%c[AI_SERVICE_ERROR] ${msg}`, 'color: #ef4444; font-weight: bold', data || '');
};

export const processImage = async (base64Image: string) => {
  log("Requesting image analysis via /api/process");
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ action: 'image', payload: base64Image })
    });

    if (!response.ok) {
      const text = await response.text();
      errLog(`HTTP Error ${response.status}`, text);
      throw new Error(`SERVER_ERROR_${response.status}: ${text || 'Unknown response'}`);
    }

    const data = await response.json();
    log("Analysis complete", data);
    return data;
  } catch (err: any) {
    errLog("Process failed", err.message);
    throw err;
  }
};

export const processVoice = async (transcript: string) => {
  log("Requesting voice analysis via /api/process");
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ action: 'voice', payload: transcript })
    });

    if (!response.ok) {
      const text = await response.text();
      errLog(`HTTP Error ${response.status}`, text);
      throw new Error(`SERVER_ERROR_${response.status}: ${text || 'Unknown response'}`);
    }

    return await response.json();
  } catch (err: any) {
    errLog("Voice analysis failed", err.message);
    throw err;
  }
};