import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UploadedFile } from "../types";
import { HARDCODED_API_KEY } from "../constants";

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

// 舊版非串流方法 (保留相容性)
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
    handleError(error, modelId);
    return ""; // Should not reach here
  }
};

// 新版串流方法 (極速回應)
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

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
        safetySettings: SAFETY_SETTINGS,
      }
    });

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

const handleError = (error: any, modelId: string) => {
    console.error("Gemini API Error:", error);
    
    // 嘗試解析錯誤結構
    const errorCode = error.error?.code || error.status || 0;
    const errorMessage = error.message || error.error?.message || JSON.stringify(error);

    // 處理 429 Resource Exhausted
    if (
        errorMessage.includes("429") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") || 
        errorMessage.includes("quota") ||
        errorCode === 429 ||
        errorCode === "RESOURCE_EXHAUSTED"
    ) {
      throw new Error(`額度耗盡 (Quota Exceeded)。\n\n1. 若您是付費會員：請檢查此 API Key 是否建立在「有綁定信用卡」的專案中。免費專案的 Key 無法使用付費額度。\n2. 預覽版限制：Gemini 3 Pro Preview 的每分鐘請求數 (RPM) 很低，請切換至 Gemini 1.5 Pro 或 2.0 Flash 試試。`);
    }

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      throw new Error(`找不到模型 '${modelId}'。\n請確認您的 API Key 是否有權限存取 Gemini 3 Pro Preview。\n(若使用免費 Key，通常無權限)`);
    }
    if (errorMessage.includes("403") || errorMessage.includes("permission")) {
        throw new Error(`API Key 權限不足或無效。請檢查 Key 是否正確。`);
    }
    throw error;
}

export const testConnection = async (modelId: string, apiKey?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: "Hello" }] },
    });
    
    if (response && response.text) {
         return { success: true, message: `連線成功` };
    } else {
        throw new Error("API 連線建立但無回應");
    }

  } catch (error: any) {
    console.error("Test Connection Error:", error);
    let errMsg = error.message || JSON.stringify(error);
    const errStatus = error.status || error.error?.status;

    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errStatus === "RESOURCE_EXHAUSTED") {
        errMsg = "429 額度耗盡：請確認 API Key 的專案是否已綁定 Billing (信用卡)，或切換至 Flash 模型。";
    }
    else if (errMsg.includes("404")) errMsg = "模型未授權或不存在 (404)";
    else if (errMsg.includes("400")) errMsg = "請求格式無效 (400)";
    else if (errMsg.includes("403")) errMsg = "存取被拒 (403)";

    return { success: false, message: `${errMsg}` };
  }
};
