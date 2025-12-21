/**
 * BuildFlow AI Service (with Diagnostics)
 */

const log = (msg: string, data?: any) => {
  console.log(`%c[CLIENT_DIAGNOSTIC] ${msg}`, 'color: #10b981; font-weight: bold', data || '');
};

const errLog = (msg: string, data?: any) => {
  console.error(`%c[CLIENT_ERROR] ${msg}`, 'color: #ef4444; font-weight: bold', data || '');
};

export const processImage = async (base64Image: string) => {
  log("Initiating image analysis request to /api/process");
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'image', payload: base64Image })
    });

    log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      errLog(`Server rejected request. Body: ${text.substring(0, 200)}`);
      throw new Error(`SERVER_ERR_${response.status}: ${text || 'Unknown Error'}`);
    }

    const data = await response.json();
    log("Successfully received JSON from server", data);
    return data;
  } catch (err: any) {
    errLog("Network or Server error", err.message);
    throw err;
  }
};

export const processVoice = async (transcript: string) => {
  log("Initiating voice analysis request to /api/process", { transcriptLength: transcript.length });
  
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'voice', payload: transcript })
    });

    log(`Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      errLog(`Server rejected voice request. Body: ${text}`);
      throw new Error(`SERVER_ERR_${response.status}: ${text}`);
    }

    return await response.json();
  } catch (err: any) {
    errLog("Voice process failed", err.message);
    throw err;
  }
};