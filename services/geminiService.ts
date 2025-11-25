import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UploadedFile } from "../types";
import { HARDCODED_API_KEY } from "../constants";

// ==========================================
// 設定重試參數 (針對 503 模型過載)
// ==========================================
const MAX_RETRIES = 3; // 最大重試次數
const RETRY_DELAY = 2000; // 每次重試等待 2 秒

// 輔助函式：延遲等待
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAiClient = (customKey?: string) => {
  // 優先順序: 1. 前端輸入的 Key 2. constants.ts 裡寫死的 Key 3. 環境變數
  const key = customKey || HARDCODED_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. 請在設定中輸入，或在 constants.ts 中填寫 HARDCODED_API_KEY。");
  }
  return new GoogleGenAI({ apiKey: key });
};

// 預設為最寬鬆的設定
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// 舊版非串流方法 (保留相容性，已加入重試機制)
export const runAudit = async (
  text: string, 
  file: UploadedFile | null, 
  systemPrompt: string,
  modelId: string,
  apiKey?: string
): Promise<string> => {
  const ai = getAiClient(apiKey);
  const parts: any[] = [];
  if (text) parts.push({ text });
  if (file) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  }

  if (parts.length === 0) throw new Error("No content to audit.");

  let lastError: any;

  // 重試迴圈
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.9,
          safetySettings: SAFETY_SETTINGS,
        }
      });

      if (response.text) return response.text;
      throw new Error("模型回應為空");

    } catch (error: any) {
      lastError = error;
      // 檢查是否為 503 (Overloaded) 或 500 (Server Error)
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        console.warn(`[Gemini Service] 遇到錯誤 (Attempt ${attempt}/${MAX_RETRIES})，${RETRY_DELAY}ms 後重試...`, error.message);
        await delay(RETRY_DELAY);
        continue; // 繼續下一次迴圈
      }
      // 如果不是可重試的錯誤，或次數用盡，直接跳出
      break; 
    }
  }

  // 如果跑完迴圈還是失敗
  handleError(lastError, modelId);
  return ""; 
};

// 新版串流方法 (極速回應，已加入重試機制)
export const runAuditStream = async function* (
  text: string, 
  file: UploadedFile | null, 
  systemPrompt: string,
  modelId: string,
  apiKey?: string
): AsyncGenerator<string> {
  const ai = getAiClient(apiKey);
  const parts: any[] = [];
  
  if (text) parts.push({ text });
  if (file) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  }

  if (parts.length === 0) throw new Error("No content to audit.");

  let responseStream: any = null;

  // 1. 建立連線階段 (加入重試機制)
  // 因為 503 通常發生在「建立連線」的那一瞬間
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.9,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      // 如果成功拿到 stream 物件，就跳出重試迴圈
      break; 

    } catch (error: any) {
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
         console.warn(`[Gemini Stream] 連線忙碌 (Attempt ${attempt}/${MAX_RETRIES})，準備重試...`);
         await delay(RETRY_DELAY);
         continue;
      }
      // 無法重試或次數用盡，交給下方的錯誤處理
      handleError(error, modelId);
      return;
    }
  }

  // 2. 讀取串流階段
  try {
    if (!responseStream) throw new Error("無法建立串流連線");

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (error: any) {
    handleError(error, modelId);
  }
};

// 判斷錯誤是否值得重試
const isRetryableError = (error: any): boolean => {
    const msg = (error.message || "").toLowerCase();
    const status = error.status || 0;
    
    // 503: Service Unavailable (Overloaded)
    // 500: Internal Server Error
    // 504: Gateway Timeout
    if (status === 503 || status === 500 || status === 504) return true;
    
    if (msg.includes("overloaded") || msg.includes("503") || msg.includes("service unavailable")) return true;

    return false;
};

const handleError = (error: any, modelId: string) => {
    console.error("Gemini API Error:", error);
    
    const msg = (error.message || "").toLowerCase();

    // 處理 503 Overloaded (經過重試後依然失敗)
    if (msg.includes("503") || msg.includes("overloaded") || msg.includes("service unavailable")) {
        throw new Error(`🔥 Google 伺服器目前過載 (Overloaded)。\nGemini 3 Pro 太熱門了，系統已為您自動重試 ${MAX_RETRIES} 次但仍失敗。\n請休息 1 分鐘後再試。`);
    }

    // 處理 429 Resource Exhausted
    if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
      throw new Error(`額度耗盡 (Quota Exceeded)。\n您的 API Key 免費額度已達上限 (429)。\nGemini 3 Preview 限制較嚴格，請稍後再試。`);
    }

    if (msg.includes("404") || msg.includes("not found")) {
      throw new Error(`找不到模型 '${modelId}'。\n請確認您的 API Key 專案是否有權限存取此模型，或模型 ID 是否正確。`);
    }

    if (msg.includes("403") || msg.includes("permission")) {
        throw new Error(`API Key 權限不足或無效 (403)。請檢查 Key 是否正確。`);
    }
    
    throw error;
}

export const testConnection = async (modelId: string, apiKey?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const ai = getAiClient(apiKey);
    
    // 測試連線也加入簡單的重試，避免誤判
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: "Hello" }] },
            });
            
            if (response && response.text) {
                return { success: true, message: `連線成功` };
            }
        } catch (e: any) {
            if (isRetryableError(e) && attempt < 2) {
                await delay(1000);
                continue;
            }
            throw e;
        }
    }
    throw new Error("API 連線建立但無回應");

  } catch (error: any) {
    console.error("Test Connection Error:", error);
    let errMsg = error.message || "Unknown error";

    if (errMsg.includes("503") || errMsg.includes("overloaded")) errMsg = "伺服器忙碌中 (503)，但 Key 是有效的";
    else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) errMsg = "額度耗盡 (429 Quota Exceeded)";
    else if (errMsg.includes("404")) errMsg = "模型未授權 (404)";
    else if (errMsg.includes("400")) errMsg = "Key 格式無效 (400)";
    else if (errMsg.includes("403")) errMsg = "存取被拒 (403)";

    return { success: false, message: `${errMsg}` };
  }
};
